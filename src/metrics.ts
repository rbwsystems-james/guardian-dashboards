// All metric maths lives here and follows the "Metric definitions" table in the build spec.
// Times are hours since the data start (or any common origin); windows are [from, to) in hours.

export type Window = readonly [number, number]

export const HOURS_PER_DAY = 24

/** NWPD / EGM = Net win ÷ EGM-days. */
export function nwpd(netWin: number, egmDays: number): number | null {
  return egmDays > 0 ? netWin / egmDays : null
}

/** Merge overlapping windows so overlapping calls on one asset are counted once. */
export function mergeWindows(windows: readonly Window[]): Window[] {
  const sorted = windows.filter((w) => w[1] > w[0]).sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const [s, e] of sorted) {
    const last = out[out.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else out.push([s, e])
  }
  return out
}

/** Downtime hours = union of logged→closed windows, clipped to the period [from, to). */
export function downtimeHours(windows: readonly Window[], from: number, to: number): number {
  let total = 0
  for (const [s, e] of mergeWindows(windows)) {
    const a = Math.max(s, from)
    const b = Math.min(e, to)
    if (b > a) total += b - a
  }
  return total
}

/** Fleet uptime % = 1 − (downtime hours ÷ (EGM-days × 24)). Returned as a percentage. */
export function uptimePct(downtimeHrs: number, egmDays: number): number | null {
  if (egmDays <= 0) return null
  return (1 - downtimeHrs / (egmDays * HOURS_PER_DAY)) * 100
}

export interface DowntimeAsset {
  downtimeHours: number
  /** The asset's NWPD over the 30 days before the period. */
  nwpd30: number
}

/** Revenue lost to downtime = Σ downtime hours × (asset NWPD over prior 30 days ÷ 24). */
export function revenueLost(assets: readonly DowntimeAsset[]): number {
  let total = 0
  for (const a of assets) total += a.downtimeHours * (a.nwpd30 / HOURS_PER_DAY)
  return total
}

/** Calls per 100 EGMs = calls ÷ average active EGMs in scope × 100. */
export function callsPer100(calls: number, avgActiveEgms: number): number | null {
  return avgActiveEgms > 0 ? (calls / avgActiveEgms) * 100 : null
}

/** (This period − previous equivalent period) ÷ previous equivalent period. */
export function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

export interface CallTimes {
  assetId: number
  categoryId: number
  loggedH: number
  closedH: number | null
}

/**
 * A closed call is eligible for FTFR if it closed within the period and at least
 * `windowDays` before the data end, so its 7-day window has fully run.
 */
export function isFtfrEligible(
  closedH: number | null,
  periodStartH: number,
  periodEndH: number,
  dataEndH: number,
  windowDays = 7,
): boolean {
  if (closedH == null) return false
  return closedH >= periodStartH && closedH < periodEndH && closedH <= dataEndH - windowDays * HOURS_PER_DAY
}

/**
 * First-time fix: a closed call with no new call opened on the same asset,
 * in the same issue category, within `windowDays` of closure.
 */
export function isFirstTimeFix(call: CallTimes, assetCalls: readonly CallTimes[], windowDays = 7): boolean {
  if (call.closedH == null) return false
  const limit = call.closedH + windowDays * HOURS_PER_DAY
  return !assetCalls.some(
    (o) => o !== call && o.categoryId === call.categoryId && o.loggedH > call.closedH! && o.loggedH <= limit,
  )
}

/** First-time fix rate = first-time fixes ÷ eligible closed calls (percentage). */
export function ftfr(firstTimeFixes: number, eligible: number): number | null {
  return eligible > 0 ? (firstTimeFixes / eligible) * 100 : null
}

/** Open calls = calls logged on or before period end and not closed by period end. */
export function isOpenAt(call: Pick<CallTimes, 'loggedH' | 'closedH'>, atH: number): boolean {
  return call.loggedH <= atH && (call.closedH == null || call.closedH > atH)
}

export function mean(xs: readonly number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

export function median(xs: readonly number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
