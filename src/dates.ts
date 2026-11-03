import { CONFIG } from './config'

// Dates are handled as integer "day indexes" counted from the first day of data (0 = DATA_START).
// All calendar maths is UTC so results never depend on the viewer's time zone.

const MS_DAY = 86_400_000

export function isoToEpochDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY)
}

const START_EPOCH = isoToEpochDay(CONFIG.DATA_START)
export const N_DAYS = isoToEpochDay(CONFIG.DATA_END) - START_EPOCH + 1
/** End of data in hours since the data start. */
export const DATA_END_H = N_DAYS * 24

export const isoToIdx = (iso: string) => isoToEpochDay(iso) - START_EPOCH
export const idxToDate = (idx: number) => new Date((START_EPOCH + idx) * MS_DAY)

export function idxToISO(idx: number): string {
  return idxToDate(idx).toISOString().slice(0, 10)
}

/** Day of week, 0 = Sunday. */
export const idxDow = (idx: number) => idxToDate(idx).getUTCDay()

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** MM/DD/YYYY */
export function fmtUS(idx: number): string {
  const d = idxToDate(idx)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
}

/** MM/DD */
export function fmtShort(idx: number): string {
  return fmtUS(idx).slice(0, 5)
}

export function monthKey(idx: number): string {
  return idxToISO(idx).slice(0, 7)
}

/** First day index of a YYYY-MM month (may be negative). */
export function monthStartIdx(key: string): number {
  return isoToIdx(`${key}-01`)
}

export function monthEndIdx(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return isoToIdx(new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10))
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

export function monthLabel(key: string, long = false): string {
  const [y, m] = key.split('-').map(Number)
  return long ? `${MONTHS_LONG[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`
}

export function monthLabelShort(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS[m - 1]} '${String(y).slice(2)}`
}

/** Index of the first day of the week containing idx. */
export function weekStartIdx(idx: number): number {
  const dow = idxDow(idx)
  return idx - ((dow - CONFIG.WEEK_START + 7) % 7)
}

export const LAST_IDX = N_DAYS - 1
