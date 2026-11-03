import { CONFIG } from './config'
import {
  LAST_IDX,
  addMonths,
  fmtShort,
  fmtUS,
  idxToISO,
  isoToIdx,
  monthEndIdx,
  monthKey,
  monthLabel,
  monthLabelShort,
  monthStartIdx,
  weekStartIdx,
} from './dates'

export type PeriodMode = 'week' | 'month' | 'range'

export interface PeriodSel {
  mode: PeriodMode
  /** YYYY-MM */
  month: string
  /** Week start, YYYY-MM-DD */
  week: string
  from: string
  to: string
}

export interface Bucket {
  start: number
  end: number
  label: string
  /** Longer label for tooltips */
  full: string
}

export interface Span { start: number; end: number }

export interface ResolvedPeriod {
  mode: PeriodMode
  /** Inclusive day indexes of the selected period, clipped to the data. */
  start: number
  end: number
  label: string
  prev: Span | null
  buckets: Bucket[]
  /** Index into buckets of the selected period; -1 highlights every bucket (range mode). */
  selected: number
  trendSubtitle: string
  snapshotSubtitle: string
}

export const FIRST_MONTH = monthKey(0)
export const LAST_MONTH = monthKey(LAST_IDX)

/** Weeks fully inside the data; the last one is the default. */
export function weekOptions(): number[] {
  const out: number[] = []
  let w = weekStartIdx(0)
  if (w < 0) w += 7
  for (; w + 6 <= LAST_IDX; w += 7) out.push(w)
  return out
}

export const DEFAULT_PERIOD: PeriodSel = (() => {
  const weeks = weekOptions()
  const lastWeek = weeks[weeks.length - 1]
  const lastFullMonth = monthEndIdx(LAST_MONTH) <= LAST_IDX ? LAST_MONTH : addMonths(LAST_MONTH, -1)
  return {
    mode: 'month',
    month: lastFullMonth,
    week: idxToISO(lastWeek),
    from: idxToISO(Math.max(0, LAST_IDX - 89)),
    to: idxToISO(LAST_IDX),
  }
})()

const clip = (n: number) => Math.min(LAST_IDX, Math.max(0, n))

function monthBuckets(endKey: string, count: number): Bucket[] {
  const out: Bucket[] = []
  for (let k = count - 1; k >= 0; k--) {
    const key = addMonths(endKey, -k)
    const s = monthStartIdx(key)
    const e = monthEndIdx(key)
    if (e < 0 || s > LAST_IDX) continue
    out.push({ start: clip(s), end: clip(e), label: monthLabelShort(key), full: monthLabel(key, true) })
  }
  return out
}

function weekBuckets(from: number, to: number, clipToSpan: boolean): Bucket[] {
  const out: Bucket[] = []
  for (let w = weekStartIdx(from); w <= to; w += 7) {
    const s = clipToSpan ? Math.max(w, from) : w
    const e = clipToSpan ? Math.min(w + 6, to) : w + 6
    if (e < 0 || s > LAST_IDX) continue
    out.push({ start: clip(s), end: clip(e), label: fmtShort(w), full: `Week of ${fmtUS(w)}` })
  }
  return out
}

export function resolvePeriod(sel: PeriodSel): ResolvedPeriod {
  if (sel.mode === 'month') {
    const s = monthStartIdx(sel.month)
    const e = monthEndIdx(sel.month)
    const buckets = monthBuckets(sel.month, 12)
    const prevKey = addMonths(sel.month, -1)
    const ps = monthStartIdx(prevKey)
    const pe = monthEndIdx(prevKey)
    return {
      mode: 'month',
      start: clip(s),
      end: clip(e),
      label: monthLabel(sel.month, true),
      prev: pe >= 0 ? { start: clip(ps), end: clip(pe) } : null,
      buckets,
      selected: buckets.length - 1,
      trendSubtitle: `Last 12 months to ${monthLabel(sel.month)}`,
      snapshotSubtitle: monthLabel(sel.month, true),
    }
  }
  if (sel.mode === 'week') {
    const s = isoToIdx(sel.week)
    const buckets: Bucket[] = []
    for (let k = 11; k >= 0; k--) {
      const ws = s - 7 * k
      if (ws + 6 < 0) continue
      buckets.push({ start: clip(ws), end: clip(ws + 6), label: fmtShort(ws), full: `Week of ${fmtUS(ws)}` })
    }
    return {
      mode: 'week',
      start: clip(s),
      end: clip(s + 6),
      label: `Week of ${fmtUS(s)}`,
      prev: s - 1 >= 0 ? { start: clip(s - 7), end: clip(s - 1) } : null,
      buckets,
      selected: buckets.length - 1,
      trendSubtitle: `Last 12 weeks to week of ${fmtUS(s)}`,
      snapshotSubtitle: `${fmtUS(s)} – ${fmtUS(clip(s + 6))}`,
    }
  }
  // Range
  let a = isoToIdx(sel.from)
  let b = isoToIdx(sel.to)
  if (a > b) [a, b] = [b, a]
  a = clip(a)
  b = clip(b)
  const days = b - a + 1
  let buckets: Bucket[]
  if (days <= 31) {
    buckets = Array.from({ length: days }, (_, i) => ({ start: a + i, end: a + i, label: fmtShort(a + i), full: fmtUS(a + i) }))
  } else if (days <= 186) {
    buckets = weekBuckets(a, b, true)
  } else {
    buckets = []
    for (let key = monthKey(a); monthStartIdx(key) <= b; key = addMonths(key, 1)) {
      const s = Math.max(a, monthStartIdx(key))
      const e = Math.min(b, monthEndIdx(key))
      buckets.push({ start: s, end: e, label: monthLabelShort(key), full: monthLabel(key, true) })
    }
  }
  const unit = days <= 31 ? 'Daily' : days <= 186 ? 'Weekly' : 'Monthly'
  return {
    mode: 'range',
    start: a,
    end: b,
    label: `${fmtUS(a)} – ${fmtUS(b)}`,
    prev: a - days >= 0 ? { start: a - days, end: a - 1 } : null,
    buckets,
    selected: -1,
    trendSubtitle: `${unit} · ${fmtUS(a)} – ${fmtUS(b)}`,
    snapshotSubtitle: `${fmtUS(a)} – ${fmtUS(b)}`,
  }
}

export const RANGE_MAX_DAYS = CONFIG.RANGE_MAX_MONTHS * 31
