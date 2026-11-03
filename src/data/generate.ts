import { CONFIG } from '../config'
import { DATA_END_H, N_DAYS, idxToDate } from '../dates'
import { mergeWindows } from '../metrics'
import { Rng } from './prng'
import type { Call, Company, Cumulative, Dataset, Dimension, Egm, Game, Operator, Region, Site, SiteType, Technician } from './types'
import { DIM_KEYS } from './types'

const N = CONFIG.names
const S = CONFIG.service

// Share of a day's play by hour for each site type (24 values, sums to 1), shaped per day of week.
function hourProfile(type: SiteType, dow: number): number[] {
  const weekend = dow === 5 || dow === 6
  const w: number[] = []
  for (let h = 0; h < 24; h++) {
    let v = 0.15
    if (type === 'bar') {
      if (h >= 18) v = 1 + (h - 18) * 0.35 // evening peak 6pm to midnight
      else if (h >= 12) v = 0.45
      else if (h <= 1) v = 0.8
      else if (h <= 10) v = 0.04
      if (weekend && h >= 14) v *= 1.15
    } else if (type === 'restaurant') {
      if (h >= 11 && h <= 13) v = 0.8
      else if (h >= 17 && h <= 21) v = 1.0
      else if (h >= 14 && h <= 16) v = 0.4
      else if (h >= 7 && h <= 10) v = 0.25
      else v = 0.05
    } else if (type === 'truck stop') {
      v = h >= 22 || h <= 5 ? 0.7 : h >= 6 && h <= 9 ? 0.6 : 0.5
      if (h >= 16 && h <= 21) v = 0.7
    } else {
      if (h >= 7 && h <= 9) v = 0.7
      else if (h >= 11 && h <= 13) v = 0.6
      else if (h >= 16 && h <= 20) v = 0.95
      else if (h >= 21 && h <= 23) v = 0.5
      else v = 0.06
    }
    w.push(v)
  }
  const total = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / total)
}

/** Hour profiles by site type then day of week. Exported for the heatmap. */
export const SITE_TYPES: SiteType[] = ['bar', 'restaurant', 'truck stop', 'convenience store']
export const HOUR_PROFILES: Record<SiteType, number[][]> = Object.fromEntries(
  SITE_TYPES.map((t) => [t, Array.from({ length: 7 }, (_, d) => hourProfile(t, d))]),
) as Record<SiteType, number[][]>

const DOW_FACTOR = [1.0, 0.84, 0.86, 0.9, 1.0, 1.2, 1.32]
const AVG_BET: Record<SiteType, number> = { bar: 0.88, restaurant: 0.8, 'truck stop': 1.12, 'convenience store': 0.72 }

function makeDimensions(): Dimension[] {
  return [
    { key: 'manufacturer', label: 'Manufacturer', values: N.manufacturers.values },
    { key: 'cabinet', label: 'Cabinet type', values: N.cabinets.values },
    { key: 'gamePack', label: 'Game pack', values: N.gamePacks.values },
    { key: 'validator', label: 'Bill validator', values: N.validators.values },
    { key: 'supplier', label: 'Supplier', values: N.suppliers.values },
  ]
}

export function generateDataset(seed: number = CONFIG.SEED): Dataset {
  const rng = new Rng(seed)

  // ---- Hierarchy -----------------------------------------------------------------------------
  const companies: Company[] = N.companies.map((name, id) => ({ id, name }))
  const operators: Operator[] = N.operators.map((name, id) => ({ id, companyId: Math.floor(id / 2), name }))
  const regions: Region[] = N.regions.map((r, id) => ({ id, operatorId: r.operator, name: r.name }))

  // ---- Sites ---------------------------------------------------------------------------------
  const typeKeys = Object.keys(CONFIG.sites.typeWeights) as SiteType[]
  const typeW = typeKeys.map((k) => CONFIG.sites.typeWeights[k])
  const regionWeights = [1.3, 1, 1.1, 0.8, 1.2, 0.9]
  const usedNames = new Set<string>()
  const sites: Site[] = []
  const openers = new Set(rng.shuffle(Array.from({ length: CONFIG.sites.count }, (_, i) => i)).slice(0, CONFIG.sites.opened + CONFIG.sites.closed))
  const openerList = [...openers]
  const closers = new Set(openerList.slice(0, CONFIG.sites.closed))
  const newOpeners = new Set(openerList.slice(CONFIG.sites.closed))

  const towns = ['Northgate', 'Eastside', 'Midtown', 'Westfield', 'Southport', 'Oakdale', 'Riverton', 'Hillcrest', 'Lakeview', 'Fairmont']
  const siteName = (type: SiteType): string => {
    const pool = type === 'bar' ? N.siteBars : type === 'restaurant' ? N.siteRestaurants : type === 'truck stop' ? N.siteTruckStops : N.siteConvenience
    let name: string
    do {
      const base: string = rng.pick(pool)
      name = type === 'convenience store' ? `${base} #${rng.int(2, 98)}` : usedNames.size < pool.length * 2 ? base : `${base} – ${rng.pick(towns)}`
    } while (usedNames.has(name))
    usedNames.add(name)
    return name
  }

  for (let i = 0; i < CONFIG.sites.count; i++) {
    const type = typeKeys[rng.weighted(typeW)]
    let openIdx = -rng.int(120, 2400)
    let closeIdx: number | null = null
    if (newOpeners.has(i)) openIdx = rng.int(20, N_DAYS - 70)
    if (closers.has(i)) closeIdx = rng.int(180, N_DAYS - 50)
    sites.push({
      id: i,
      name: siteName(type),
      regionId: rng.weighted(regionWeights),
      type,
      openIdx,
      closeIdx,
      quality: Math.min(2.8, Math.max(0.3, rng.lognormal(0, CONFIG.sites.qualitySigma))),
      egmIds: [],
    })
  }

  // ---- Games ---------------------------------------------------------------------------------
  const games: Game[] = N.games.map((name, id) => ({ id, name, pack: id % 6 }))
  const gameAppeal = games.map(() => rng.lognormal(0, 0.38))
  const gameBet = games.map(() => rng.lognormal(0, 0.28))

  // ---- EGMs ----------------------------------------------------------------------------------
  const egms: Egm[] = []
  const mfrFactor = [1.04, 1.0, 0.96, 1.08, 0.92, 0.9]
  const cabFactor = [1.0, 1.02, 0.94, 0.9, 1.06, 1.1]
  const addEgm = (site: Site, installIdx: number, removeIdx: number) => {
    const dims = [
      rng.weighted(N.manufacturers.shares),
      rng.weighted(N.cabinets.shares),
      rng.weighted(N.gamePacks.shares),
      rng.weighted(N.validators.shares),
      rng.weighted(N.suppliers.shares),
    ]
    const packGames = games.filter((g) => g.pack === dims[2])
    const nGames = Math.min(packGames.length, rng.int(3, 5))
    const chosen = rng.shuffle([...packGames]).slice(0, nGames)
    const raw = chosen.map(() => rng.range(0.4, 1.6))
    const rawSum = raw.reduce((a, b) => a + b, 0)
    const gameW = raw.map((x) => x / rawSum)
    const nwRaw = chosen.map((g, k) => gameW[k] * gameAppeal[g.id])
    const nwSum = nwRaw.reduce((a, b) => a + b, 0)
    const coinRaw = chosen.map((g, k) => gameW[k] * gameBet[g.id])
    const coinSum = coinRaw.reduce((a, b) => a + b, 0)
    const id = egms.length
    egms.push({
      id,
      code: `EGM-${10000 + id * 7 + 3}`,
      siteId: site.id,
      dims,
      installIdx,
      removeIdx,
      gameIds: chosen.map((g) => g.id),
      gameW,
      gameNw: nwRaw.map((x) => x / nwSum),
      gameCoin: coinRaw.map((x) => x / coinSum),
    })
    site.egmIds.push(id)
  }
  for (const site of sites) {
    const k = 3 + rng.weighted(CONFIG.sites.egmCountWeights)
    const lastDay = site.closeIdx ?? N_DAYS + 5000
    for (let j = 0; j < k; j++) {
      let install = site.openIdx
      let remove = lastDay
      // Some machines are added to established sites part-way through the window.
      if (site.openIdx < 0 && j >= 3 && rng.next() < CONFIG.sites.midWindowInstallShare * 4) install = rng.int(10, N_DAYS - 40)
      if (site.openIdx >= 0 && j >= 3) install = site.openIdx + rng.int(14, 120)
      if (j >= 1 && site.closeIdx == null && rng.next() < CONFIG.sites.midWindowRemoveShare) {
        remove = rng.int(Math.max(install + 30, 40), N_DAYS - 10)
      }
      if (install > remove) continue
      addEgm(site, install, remove)
      // A swapped machine: the removed one is replaced the next day by a new asset.
      if (remove < N_DAYS - 5 && remove < lastDay) addEgm(site, remove + 1, lastDay)
    }
  }

  // ---- Technicians ---------------------------------------------------------------------------
  const technicians: Technician[] = N.technicians.map((name, id) => ({ id, name, regionId: id % regions.length }))
  const techsByRegion = regions.map((r) => technicians.filter((t) => t.regionId === r.id))
  const techSpeed = technicians.map(() => rng.range(0.8, 1.3))
  const techSkill = technicians.map(() => rng.range(-0.05, 0.05))
  techSpeed[6] = 1.35
  techSkill[6] = -0.09 // one technician with a weaker first-time fix rate

  // ---- Service calls -------------------------------------------------------------------------
  const catWeights = N.issueCategories.map((c) => c.weight)
  const baseCatSum = catWeights.reduce((a, b) => a + b, 0)
  const callsByEgmBuild: Call[][] = egms.map(() => [])
  const calls: Call[] = []

  // Chronic repeat-offender windows: a handful of assets per year (the later cohort is still active at the data end).
  const chronic = new Map<number, { from: number; to: number; cat: number }>()
  const eligibleChronic = egms.filter((e) => e.removeIdx > N_DAYS && e.installIdx < N_DAYS - 200)
  rng.shuffle(eligibleChronic)
  const perYear = S.chronicAssetsPerYear
  for (let k = 0; k < perYear * 2; k++) {
    const e = eligibleChronic[k]
    const recent = k >= perYear
    const from = recent ? N_DAYS - rng.int(95, 150) : rng.int(Math.max(e.installIdx, 30), N_DAYS - 330)
    chronic.set(e.id, { from, to: from + rng.int(100, 140), cat: rng.weighted([0.4, 0.15, 0.1, 0.2, 0.15]) })
  }

  const newCall = (egm: Egm, catId: number, loggedH: number, depth: number): void => {
    const site = sites[egm.siteId]
    const pool = techsByRegion[site.regionId].length ? techsByRegion[site.regionId] : technicians
    const tech = rng.pick(pool)
    let res = S.resolutionMedianHours * rng.lognormal(0, S.resolutionSigma) * techSpeed[tech.id]
    const u = rng.next()
    if (u < S.stuckShare) res += rng.range(190, 470)
    else if (u < S.stuckShare + S.partsWaitShare) res += rng.range(48, 140)
    const call: Call = {
      id: -1,
      egmId: egm.id,
      categoryId: catId,
      source: rng.next() < S.autoShare ? 'auto' : 'manual',
      loggedH,
      closedH: loggedH + res,
      techId: tech.id,
    }
    calls.push(call)
    callsByEgmBuild[egm.id].push(call)
    // Not fixed first time: the same fault is logged again within 7 days of closure.
    const weakCab = egm.dims[1] === N.weakCabinet
    const fixProb = S.baseFixProb - (weakCab ? S.weakCabinetFixPenalty : 0) + techSkill[tech.id]
    if (depth < 2 && rng.next() > fixProb) {
      const again = call.closedH! + rng.range(6, 7 * 24 - 4)
      if (again < DATA_END_H && again / 24 < egm.removeIdx + 1) newCall(egm, catId, again, depth + 1)
    }
  }

  for (const egm of egms) {
    const weakJam = egm.dims[3] === N.weakValidator
    const w = weakJam ? catWeights.map((x, i) => (i === 0 ? x * S.weakValidatorJamMultiplier : x)) : catWeights
    const wSum = weakJam ? w.reduce((a, b) => a + b, 0) : baseCatSum
    const egmRate = (S.callsPerEgmWeek / 7) * (wSum / baseCatSum)
    const ch = chronic.get(egm.id)
    const from = Math.max(0, egm.installIdx)
    const to = Math.min(N_DAYS - 1, egm.removeIdx)
    for (let d = from; d <= to; d++) {
      const inChronic = ch && d >= ch.from && d <= ch.to
      const rate = inChronic ? egmRate * S.chronicRateMultiplier : egmRate
      if (rng.next() < rate) {
        const cat = inChronic && rng.next() < 0.7 ? ch!.cat : rng.weighted(w)
        newCall(egm, cat, d * 24 + rng.range(0, 24), 0)
      }
    }
  }

  calls.sort((a, b) => a.loggedH - b.loggedH)
  calls.forEach((c, i) => (c.id = i))

  // Calls still open at the data end: spread across all four backlog age buckets (S8).
  const forceOpen = (minAgeD: number, maxAgeD: number, count: number) => {
    const pool = calls.filter((c) => {
      const age = (DATA_END_H - c.loggedH) / 24
      return age >= minAgeD && age < maxAgeD && c.closedH != null
    })
    rng.shuffle(pool).slice(0, count).forEach((c) => (c.closedH = null))
  }
  forceOpen(0, 2, 4)
  forceOpen(2, 4, 5)
  forceOpen(4, 7, 4)
  forceOpen(7, 16, 4)
  for (const c of calls) {
    if (c.closedH != null && c.closedH > DATA_END_H) c.closedH = null // still open at the data end
  }

  // ---- Downtime per EGM-day (union of logged→closed windows) ---------------------------------
  const downByDay = new Float32Array(egms.length * N_DAYS)
  const callsByEgm: Call[][] = egms.map(() => [])
  for (const c of calls) callsByEgm[c.egmId].push(c)
  for (const egm of egms) {
    const wins = mergeWindows(callsByEgm[egm.id].map((c) => [c.loggedH, c.closedH ?? DATA_END_H] as const))
    for (const [s, e] of wins) {
      for (let d = Math.max(0, Math.floor(s / 24)); d < N_DAYS && d * 24 < e; d++) {
        if (d < egm.installIdx || d > egm.removeIdx) continue
        const h = Math.min(e, (d + 1) * 24) - Math.max(s, d * 24)
        if (h > 0) downByDay[egm.id * N_DAYS + d] += h
      }
    }
  }

  // ---- Daily stats → cumulative sums ---------------------------------------------------------
  const stride = N_DAYS + 1
  const cum: Cumulative = {
    netWin: new Float64Array(egms.length * stride),
    coinIn: new Float64Array(egms.length * stride),
    plays: new Float64Array(egms.length * stride),
    active: new Float64Array(egms.length * stride),
    downtime: new Float64Array(egms.length * stride),
    stride,
  }
  const doy = (d: number) => {
    const dt = idxToDate(d)
    return Math.floor((dt.getTime() - Date.UTC(dt.getUTCFullYear(), 0, 0)) / 86_400_000)
  }
  const season = Array.from({ length: N_DAYS }, (_, d) => 1 + 0.1 * Math.cos((2 * Math.PI * (doy(d) - 30)) / 365))
  const dowOf = Array.from({ length: N_DAYS }, (_, d) => idxToDate(d).getUTCDay())
  const M = CONFIG.money

  for (const egm of egms) {
    const site = sites[egm.siteId]
    const base = egm.id * stride
    const eFactor =
      mfrFactor[egm.dims[0]] * cabFactor[egm.dims[1]] * egm.gameIds.reduce((a, g, k) => a + egm.gameW[k] * gameAppeal[g], 0)
    const bet = AVG_BET[site.type] * egm.gameIds.reduce((a, g, k) => a + egm.gameW[k] * gameBet[g], 0)
    const rampStart = Math.max(site.openIdx, egm.installIdx)
    for (let d = 0; d < N_DAYS; d++) {
      const i = base + d
      let nw = 0, coin = 0, plays = 0, act = 0, down = 0
      if (d >= egm.installIdx && d <= egm.removeIdx) {
        act = 1
        down = downByDay[egm.id * N_DAYS + d]
        const age = d - rampStart
        const ramp = rampStart >= 0 && age < 56 ? 0.4 + (0.6 * age) / 56 : 1
        const trend = 1 + 0.07 * (d / N_DAYS)
        const p = M.basePlays * site.quality * ramp * season[d] * DOW_FACTOR[dowOf[d]] * trend * eFactor * rng.lognormal(0, 0.12)
        const up = 1 - down / 24
        plays = p * up
        coin = plays * bet * rng.lognormal(0, 0.05)
        nw = coin * (M.meanHold + rng.normal() * M.holdNoiseSd)
      }
      cum.netWin[i + 1] = cum.netWin[i] + nw
      cum.coinIn[i + 1] = cum.coinIn[i] + coin
      cum.plays[i + 1] = cum.plays[i] + plays
      cum.active[i + 1] = cum.active[i] + act
      cum.downtime[i + 1] = cum.downtime[i] + down
    }
  }

  // ---- Site float per week -------------------------------------------------------------------
  const nWeeks = Math.ceil(N_DAYS / 7) + 1
  const floatBySite = sites.map((site) => {
    const arr = new Float32Array(nWeeks)
    let drift = 1
    for (let w = 0; w < nWeeks; w++) {
      const mid = Math.min(N_DAYS - 1, w * 7 + 3)
      let active = 0
      for (const id of site.egmIds) if (mid >= egms[id].installIdx && mid <= egms[id].removeIdx) active++
      drift = Math.min(1.5, Math.max(0.6, drift + rng.normal() * 0.06))
      arr[w] = active ? active * M.floatPerEgm * site.quality ** 0.5 * drift * season[mid] : 0
    }
    return arr
  })

  return { companies, operators, regions, sites, egms, games, dimensions: makeDimensions(), categories: N.issueCategories.map((c) => c.name), technicians, calls, callsByEgm, cum, floatBySite }
}

export { DIM_KEYS }
