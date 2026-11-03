// The only module charts read from. Swap the synthetic source for Guardian APIs here
// without touching chart components. All maths is delegated to ../metrics.

import { CONFIG } from '../config'
import { DATA_END_H, LAST_IDX, N_DAYS, idxDow } from '../dates'
import * as M from '../metrics'
import type { Bucket, ResolvedPeriod, Span } from '../periods'
import { filterOptions, filtersKey, type Filters } from './filters'
import { generateDataset, HOUR_PROFILES, SITE_TYPES } from './generate'
import type { Call, Dataset, DimKey } from './types'
import { DIM_KEYS } from './types'

let _ds: Dataset | null = null
export function getDataset(): Dataset {
  return (_ds ??= generateDataset())
}

// ---- Scope ---------------------------------------------------------------------------------

interface Scope {
  egmIds: number[]
  egmMask: Uint8Array
  siteMask: Uint8Array
}

const scopeCache = new Map<string, Scope>()
function getScope(f: Filters): Scope {
  const key = filtersKey(f)
  const hit = scopeCache.get(key)
  if (hit) return hit
  const ds = getDataset()
  const opts = filterOptions(ds, f)
  const regIds = new Set((f.reg.length ? opts.regions.filter((r) => f.reg.includes(r.id)) : opts.regions).map((r) => r.id))
  const siteMask = new Uint8Array(ds.sites.length)
  for (const s of ds.sites) if (regIds.has(s.regionId) && (!f.site.length || f.site.includes(s.id))) siteMask[s.id] = 1
  const egmMask = new Uint8Array(ds.egms.length)
  const egmIds: number[] = []
  for (const e of ds.egms) if (siteMask[e.siteId]) { egmMask[e.id] = 1; egmIds.push(e.id) }
  const scope = { egmIds, egmMask, siteMask }
  scopeCache.set(key, scope)
  return scope
}

const cache = new Map<string, unknown>()
function memo<T>(name: string, f: Filters, p: ResolvedPeriod, extra: string, fn: () => T): T {
  const key = `${name}|${filtersKey(f)}|${p.start}-${p.end}-${p.mode}-${p.buckets.length}|${extra}`
  if (cache.has(key)) return cache.get(key) as T
  if (cache.size > 400) cache.clear()
  const v = fn()
  cache.set(key, v)
  return v
}

// ---- Aggregation helpers -------------------------------------------------------------------

interface Agg { netWin: number; coinIn: number; plays: number; egmDays: number; downtime: number }

function aggregate(scope: Scope, a: number, b: number): Agg {
  const { cum } = getDataset()
  const st = cum.stride
  const r: Agg = { netWin: 0, coinIn: 0, plays: 0, egmDays: 0, downtime: 0 }
  for (const e of scope.egmIds) {
    const i = e * st
    r.netWin += cum.netWin[i + b + 1] - cum.netWin[i + a]
    r.coinIn += cum.coinIn[i + b + 1] - cum.coinIn[i + a]
    r.plays += cum.plays[i + b + 1] - cum.plays[i + a]
    r.egmDays += cum.active[i + b + 1] - cum.active[i + a]
    r.downtime += cum.downtime[i + b + 1] - cum.downtime[i + a]
  }
  return r
}

function activeAt(scope: Scope, idx: number) {
  const ds = getDataset()
  let egms = 0
  const sites = new Set<number>()
  for (const id of scope.egmIds) {
    const e = ds.egms[id]
    if (idx >= e.installIdx && idx <= e.removeIdx) { egms++; sites.add(e.siteId) }
  }
  return { egms, locations: sites.size }
}

const hStart = (day: number) => day * 24
const hEnd = (day: number) => (day + 1) * 24

function callsLogged(scope: Scope, a: number, b: number): Call[] {
  return getDataset().calls.filter((c) => scope.egmMask[c.egmId] && c.loggedH >= hStart(a) && c.loggedH < hEnd(b))
}
function callsClosed(scope: Scope, a: number, b: number): Call[] {
  return getDataset().calls.filter((c) => scope.egmMask[c.egmId] && c.closedH != null && c.closedH >= hStart(a) && c.closedH < hEnd(b))
}

let _fixed: Uint8Array | null = null
/** 1 if the call was a first-time fix (per the metrics definition). Independent of filters, so cached once. */
function fixedFlags(): Uint8Array {
  if (_fixed) return _fixed
  const ds = getDataset()
  _fixed = new Uint8Array(ds.calls.length)
  for (const c of ds.calls) {
    _fixed[c.id] = M.isFirstTimeFix(
      { assetId: c.egmId, categoryId: c.categoryId, loggedH: c.loggedH, closedH: c.closedH },
      ds.callsByEgm[c.egmId].map((o) => ({ assetId: o.egmId, categoryId: o.categoryId, loggedH: o.loggedH, closedH: o.closedH })),
      CONFIG.FTFR_WINDOW_DAYS,
    )
      ? 1
      : 0
  }
  return _fixed
}

function ftfrFor(calls: Call[], a: number, b: number): number | null {
  const fixed = fixedFlags()
  let ok = 0
  let n = 0
  for (const c of calls) {
    if (!M.isFtfrEligible(c.closedH, hStart(a), hEnd(b), DATA_END_H, CONFIG.FTFR_WINDOW_DAYS)) continue
    n++
    ok += fixed[c.id]
  }
  return M.ftfr(ok, n)
}

/** Revenue lost per the spec: Σ asset downtime hours × (asset NWPD over the 30 days before ÷ 24). */
function revenueLostFor(scope: Scope, a: number, b: number) {
  const { cum } = getDataset()
  const st = cum.stride
  const assets: M.DowntimeAsset[] = []
  let hours = 0
  for (const e of scope.egmIds) {
    const i = e * st
    const down = cum.downtime[i + b + 1] - cum.downtime[i + a]
    if (down <= 0) continue
    const p0 = Math.max(0, a - 30)
    let days = cum.active[i + a] - cum.active[i + p0]
    let nw = cum.netWin[i + a] - cum.netWin[i + p0]
    if (days <= 0) {
      days = cum.active[i + b + 1] - cum.active[i + a] // new asset: fall back to its own period NWPD
      nw = cum.netWin[i + b + 1] - cum.netWin[i + a]
    }
    assets.push({ downtimeHours: down, nwpd30: days > 0 ? nw / days : 0 })
    hours += down
  }
  return { lost: M.revenueLost(assets), hours }
}

// ---- Shared result shapes ------------------------------------------------------------------

export interface Trend {
  buckets: Bucket[]
  selected: number
  values: (number | null)[]
  empty: boolean
}

function trend(f: Filters, p: ResolvedPeriod, fn: (a: number, b: number, scope: Scope) => number | null): Trend {
  const scope = getScope(f)
  const values = p.buckets.map((bk) => (scope.egmIds.length ? fn(bk.start, bk.end, scope) : null))
  return { buckets: p.buckets, selected: p.selected, values, empty: !scope.egmIds.length || values.every((v) => v == null || v === 0) }
}

// ---- KPIs ----------------------------------------------------------------------------------

export interface Kpi { value: number | null; prev: number | null; change: number | null }
export interface Kpis { netWin: Kpi; nwpd: Kpi; uptime: Kpi; openCalls: Kpi; ftfr: Kpi }

function kpiValues(scope: Scope, s: Span) {
  const g = aggregate(scope, s.start, s.end)
  const closed = callsClosed(scope, s.start, s.end)
  return {
    netWin: g.netWin,
    nwpd: M.nwpd(g.netWin, g.egmDays),
    uptime: M.uptimePct(g.downtime, g.egmDays),
    openCalls: getDataset().calls.filter((c) => scope.egmMask[c.egmId] && M.isOpenAt(c, hEnd(s.end))).length,
    ftfr: ftfrFor(closed, s.start, s.end),
  }
}

export function getKpis(f: Filters, p: ResolvedPeriod): Kpis {
  return memo('kpis', f, p, '', () => {
    const scope = getScope(f)
    const cur = kpiValues(scope, p)
    const prev = p.prev ? kpiValues(scope, p.prev) : null
    const k = (key: keyof typeof cur): Kpi => ({
      value: scope.egmIds.length ? cur[key] : null,
      prev: prev ? prev[key] : null,
      change: prev ? M.pctChange(cur[key], prev[key]) : null,
    })
    return { netWin: k('netWin'), nwpd: k('nwpd'), uptime: k('uptime'), openCalls: k('openCalls'), ftfr: k('ftfr') }
  })
}

// ---- Performance ---------------------------------------------------------------------------

export const getRevenueTrend = (f: Filters, p: ResolvedPeriod): Trend =>
  memo('revenue', f, p, '', () => trend(f, p, (a, b, s) => aggregate(s, a, b).netWin))

export const getNwpdTrend = (f: Filters, p: ResolvedPeriod): Trend =>
  memo('nwpd', f, p, '', () => trend(f, p, (a, b, s) => { const g = aggregate(s, a, b); return M.nwpd(g.netWin, g.egmDays) }))

export interface LocationsEgms { buckets: Bucket[]; selected: number; egms: number[]; locations: number[]; empty: boolean }
export const getLocationsEgms = (f: Filters, p: ResolvedPeriod): LocationsEgms =>
  memo('locegm', f, p, '', () => {
    const scope = getScope(f)
    const pts = p.buckets.map((b) => activeAt(scope, b.end))
    return { buckets: p.buckets, selected: p.selected, egms: pts.map((x) => x.egms), locations: pts.map((x) => x.locations), empty: pts.every((x) => x.egms === 0) }
  })

export interface SiteRow { siteId: number; name: string; netWin: number; egms: number; nwpd: number | null }

function siteRows(f: Filters, p: ResolvedPeriod): SiteRow[] {
  return memo('siterows', f, p, '', () => {
    const ds = getDataset()
    const scope = getScope(f)
    const { cum } = ds
    const st = cum.stride
    const rows = new Map<number, { nw: number; days: number; egms: number; minInst: number; maxRem: number }>()
    for (const id of scope.egmIds) {
      const e = ds.egms[id]
      const days = cum.active[id * st + p.end + 1] - cum.active[id * st + p.start]
      if (days <= 0) continue
      const r = rows.get(e.siteId) ?? { nw: 0, days: 0, egms: 0, minInst: Infinity, maxRem: -Infinity }
      r.nw += cum.netWin[id * st + p.end + 1] - cum.netWin[id * st + p.start]
      r.days += days
      r.egms++
      r.minInst = Math.min(r.minInst, e.installIdx)
      r.maxRem = Math.max(r.maxRem, e.removeIdx)
      rows.set(e.siteId, r)
    }
    return [...rows.entries()].map(([siteId, r]) => ({
      siteId,
      name: ds.sites[siteId].name,
      netWin: r.nw,
      egms: r.egms,
      nwpd: M.nwpd(r.nw, r.days),
      // Site active days: the span the site had machines installed, clipped to the period.
      _days: Math.min(p.end, r.maxRem) - Math.max(p.start, r.minInst) + 1,
    } as SiteRow & { _days: number }))
  })
}

export const getTopSites = (f: Filters, p: ResolvedPeriod): SiteRow[] =>
  siteRows(f, p).slice().sort((a, b) => b.netWin - a.netWin).slice(0, 10)

export const getBottomSites = (f: Filters, p: ResolvedPeriod): SiteRow[] =>
  (siteRows(f, p) as (SiteRow & { _days: number })[])
    .filter((r) => r._days >= CONFIG.MIN_ACTIVE_DAYS_P5 && r.nwpd != null)
    .sort((a, b) => a.nwpd! - b.nwpd!)
    .slice(0, 10)

export interface GameRow { name: string; nwpd: number; plays: number; avgBet: number }
export const getTopGames = (f: Filters, p: ResolvedPeriod): GameRow[] =>
  memo('games', f, p, '', () => {
    const ds = getDataset()
    const scope = getScope(f)
    const { cum } = ds
    const st = cum.stride
    const acc = ds.games.map(() => ({ nw: 0, days: 0, plays: 0, coin: 0 }))
    for (const id of scope.egmIds) {
      const e = ds.egms[id]
      const i = id * st
      const days = cum.active[i + p.end + 1] - cum.active[i + p.start]
      if (days <= 0) continue
      const nw = cum.netWin[i + p.end + 1] - cum.netWin[i + p.start]
      const coin = cum.coinIn[i + p.end + 1] - cum.coinIn[i + p.start]
      const plays = cum.plays[i + p.end + 1] - cum.plays[i + p.start]
      e.gameIds.forEach((g, k) => {
        const a = acc[g]
        a.nw += nw * e.gameNw[k]
        a.days += days * e.gameW[k]
        a.plays += plays * e.gameW[k]
        a.coin += coin * e.gameCoin[k]
      })
    }
    return acc
      .map((a, g) => ({ name: ds.games[g].name, nwpd: a.days > 0 ? a.nw / a.days : 0, plays: a.plays, avgBet: a.plays > 0 ? a.coin / a.plays : 0, days: a.days }))
      .filter((r) => r.days >= 20)
      .sort((a, b) => b.nwpd - a.nwpd)
      .slice(0, 5)
      .map(({ name, nwpd, plays, avgBet }) => ({ name, nwpd, plays, avgBet }))
  })

export interface CategoryRow { name: string; value: number; egms: number }
export const getCategoryNwpd = (f: Filters, p: ResolvedPeriod, dim: DimKey): CategoryRow[] =>
  memo('catnwpd', f, p, dim, () => {
    const ds = getDataset()
    const scope = getScope(f)
    const k = DIM_KEYS.indexOf(dim)
    const values = ds.dimensions[k].values
    const acc = values.map(() => ({ nw: 0, days: 0, egms: 0 }))
    const { cum } = ds
    const st = cum.stride
    for (const id of scope.egmIds) {
      const days = cum.active[id * st + p.end + 1] - cum.active[id * st + p.start]
      if (days <= 0) continue
      const a = acc[ds.egms[id].dims[k]]
      a.nw += cum.netWin[id * st + p.end + 1] - cum.netWin[id * st + p.start]
      a.days += days
      a.egms++
    }
    return values
      .map((name, i) => ({ name, value: acc[i].days ? acc[i].nw / acc[i].days : 0, egms: acc[i].egms }))
      .filter((r) => r.egms > 0)
      .sort((a, b) => b.value - a.value)
  })

export interface Heatmap { cells: [number, number, number][]; max: number; min: number; empty: boolean }
/** Net win per EGM-hour by day of week × hour of day, averaged across the period. */
export const getHeatmap = (f: Filters, p: ResolvedPeriod): Heatmap =>
  memo('heat', f, p, '', () => {
    const ds = getDataset()
    const scope = getScope(f)
    const { cum } = ds
    const st = cum.stride
    const nw = SITE_TYPES.map(() => new Float64Array(7))
    const days = new Float64Array(7)
    for (const id of scope.egmIds) {
      const e = ds.egms[id]
      const t = SITE_TYPES.indexOf(ds.sites[e.siteId].type)
      for (let d = Math.max(p.start, e.installIdx); d <= Math.min(p.end, e.removeIdx); d++) {
        const dow = idxDow(d)
        nw[t][dow] += cum.netWin[id * st + d + 1] - cum.netWin[id * st + d]
        days[dow]++
      }
    }
    const cells: [number, number, number][] = []
    let max = 0
    let min = Infinity
    for (let dow = 0; dow < 7; dow++) {
      for (let h = 0; h < 24; h++) {
        let total = 0
        SITE_TYPES.forEach((t, ti) => (total += nw[ti][dow] * HOUR_PROFILES[t][dow][h]))
        const v = days[dow] > 0 ? total / days[dow] : 0
        cells.push([h, dow, +v.toFixed(2)])
        max = Math.max(max, v)
        min = Math.min(min, v)
      }
    }
    return { cells, max, min: Number.isFinite(min) ? min : 0, empty: days.every((x) => x === 0) }
  })

export const getFloatTrend = (f: Filters, p: ResolvedPeriod): Trend =>
  memo('float', f, p, '', () => {
    const ds = getDataset()
    return trend(f, p, (_a, b, scope) => {
      const w = Math.floor(b / 7)
      let total = 0
      for (const s of ds.sites) if (scope.siteMask[s.id]) total += ds.floatBySite[s.id][w]
      return total
    })
  })

// ---- Service -------------------------------------------------------------------------------

export const getUptimeTrend = (f: Filters, p: ResolvedPeriod): Trend =>
  memo('uptime', f, p, '', () => trend(f, p, (a, b, s) => { const g = aggregate(s, a, b); return M.uptimePct(g.downtime, g.egmDays) }))

export interface LostTrend extends Trend { hours: (number | null)[] }
export const getRevenueLostTrend = (f: Filters, p: ResolvedPeriod): LostTrend =>
  memo('lost', f, p, '', () => {
    const scope = getScope(f)
    const res = p.buckets.map((b) => (scope.egmIds.length ? revenueLostFor(scope, b.start, b.end) : null))
    const values = res.map((r) => (r ? r.lost : null))
    return { buckets: p.buckets, selected: p.selected, values, hours: res.map((r) => (r ? r.hours : null)), empty: values.every((v) => !v) }
  })

export const getCallsTrend = (f: Filters, p: ResolvedPeriod, per100: boolean): Trend =>
  memo('calls', f, p, String(per100), () =>
    trend(f, p, (a, b, s) => {
      const n = callsLogged(s, a, b).length
      if (!per100) return n
      const g = aggregate(s, a, b)
      return M.callsPer100(n, g.egmDays / (b - a + 1))
    }),
  )

export interface ResolutionTrend { buckets: Bucket[]; selected: number; avg: (number | null)[]; median: (number | null)[]; empty: boolean }
export const getResolutionTrend = (f: Filters, p: ResolvedPeriod): ResolutionTrend =>
  memo('res', f, p, '', () => {
    const scope = getScope(f)
    const sets = p.buckets.map((b) => callsClosed(scope, b.start, b.end).map((c) => c.closedH! - c.loggedH))
    return {
      buckets: p.buckets,
      selected: p.selected,
      avg: sets.map((s) => M.mean(s)),
      median: sets.map((s) => M.median(s)),
      empty: sets.every((s) => !s.length),
    }
  })

export const getFtfrTrend = (f: Filters, p: ResolvedPeriod): Trend =>
  memo('ftfr', f, p, '', () => trend(f, p, (a, b, s) => ftfrFor(callsClosed(s, a, b), a, b)))

export interface PieRow { name: string; value: number }
export interface TopIssues { rows: PieRow[]; coverage: number; empty: boolean }
export const getTopIssues = (f: Filters, p: ResolvedPeriod): TopIssues =>
  memo('issues', f, p, '', () => {
    const ds = getDataset()
    const calls = callsLogged(getScope(f), p.start, p.end)
    const counts = ds.categories.map(() => 0)
    for (const c of calls) counts[c.categoryId]++
    const otherId = ds.categories.indexOf('Other')
    const ranked = counts
      .map((value, i) => ({ name: ds.categories[i], value }))
      .filter((_, i) => i !== otherId)
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    const top = ranked.reduce((a, r) => a + r.value, 0)
    return { rows: ranked, coverage: calls.length ? top / calls.length : 0, empty: !calls.length }
  })

export const getCallsByCategory = (f: Filters, p: ResolvedPeriod, dim: DimKey, per100: boolean): CategoryRow[] =>
  memo('callcat', f, p, `${dim}|${per100}`, () => {
    const ds = getDataset()
    const scope = getScope(f)
    const k = DIM_KEYS.indexOf(dim)
    const values = ds.dimensions[k].values
    const calls = values.map(() => 0)
    for (const c of callsLogged(scope, p.start, p.end)) calls[ds.egms[c.egmId].dims[k]]++
    const days = values.map(() => 0)
    const egms = values.map(() => 0)
    const { cum } = ds
    const st = cum.stride
    for (const id of scope.egmIds) {
      const d = cum.active[id * st + p.end + 1] - cum.active[id * st + p.start]
      if (d <= 0) continue
      days[ds.egms[id].dims[k]] += d
      egms[ds.egms[id].dims[k]]++
    }
    const span = p.end - p.start + 1
    return values
      .map((name, i) => ({
        name,
        value: per100 ? (M.callsPer100(calls[i], days[i] / span) ?? 0) : calls[i],
        egms: egms[i],
      }))
      .filter((r) => r.egms > 0)
      .sort((a, b) => b.value - a.value)
  })

export interface Backlog { labels: string[]; counts: number[]; total: number }
export const getBacklog = (f: Filters, p: ResolvedPeriod): Backlog =>
  memo('backlog', f, p, '', () => {
    const scope = getScope(f)
    const counts = [0, 0, 0, 0]
    const at = hEnd(p.end)
    for (const c of getDataset().calls) {
      if (!scope.egmMask[c.egmId] || !M.isOpenAt(c, at)) continue
      const age = (at - c.loggedH) / 24
      counts[age < 2 ? 0 : age < 4 ? 1 : age < 7 ? 2 : 3]++
    }
    return { labels: ['0–1 days', '2–3 days', '4–7 days', '7+ days'], counts, total: counts.reduce((a, b) => a + b, 0) }
  })

export interface OffenderRow {
  siteId: number
  asset: string
  site: string
  manufacturer: string
  cabinet: string
  calls: number
  topIssue: string
  downtime: number
}
/** Fixed 90-day window to the period end; ignores the period toggle length on purpose. */
export const getRepeatOffenders = (f: Filters, p: ResolvedPeriod): OffenderRow[] =>
  memo('offenders', f, p, String(p.end), () => {
    const ds = getDataset()
    const scope = getScope(f)
    const a = Math.max(0, p.end - CONFIG.REPEAT_OFFENDER_DAYS + 1)
    const byEgm = new Map<number, number[]>()
    for (const c of callsLogged(scope, a, p.end)) {
      const arr = byEgm.get(c.egmId) ?? ds.categories.map(() => 0)
      arr[c.categoryId]++
      byEgm.set(c.egmId, arr)
    }
    const { cum } = ds
    return [...byEgm.entries()]
      .map(([id, cats]) => {
        const e = ds.egms[id]
        const top = cats.indexOf(Math.max(...cats))
        return {
          siteId: e.siteId,
          asset: e.code,
          site: ds.sites[e.siteId].name,
          manufacturer: ds.dimensions[0].values[e.dims[0]],
          cabinet: ds.dimensions[1].values[e.dims[1]],
          calls: cats.reduce((x, y) => x + y, 0),
          topIssue: ds.categories[top],
          downtime: cum.downtime[id * cum.stride + p.end + 1] - cum.downtime[id * cum.stride + a],
        }
      })
      .sort((x, y) => y.calls - x.calls || y.downtime - x.downtime)
      .slice(0, 10)
  })

export interface TechRow { name: string; closed: number; medianHours: number | null; ftfr: number | null }
export const getTechnicians = (f: Filters, p: ResolvedPeriod): TechRow[] =>
  memo('techs', f, p, '', () => {
    const ds = getDataset()
    const closed = callsClosed(getScope(f), p.start, p.end)
    return ds.technicians
      .map((t) => {
        const mine = closed.filter((c) => c.techId === t.id)
        return {
          name: t.name,
          closed: mine.length,
          medianHours: M.median(mine.map((c) => c.closedH! - c.loggedH)),
          ftfr: ftfrFor(mine, p.start, p.end),
        }
      })
      .filter((r) => r.closed > 0)
      .sort((a, b) => b.closed - a.closed)
  })

export { LAST_IDX, N_DAYS }
