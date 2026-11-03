const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Compact currency for axes: $1.2M, $345K. */
export function usdCompact(v: number): string {
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1e6) return `${sign}$${+(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`.replace(/\.0+M/, 'M')
  if (a >= 1e3) return `${sign}$${+(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`.replace(/\.0K/, 'K')
  return `${sign}$${Math.round(a)}`
}
export const usdFull = (v: number) => usd2.format(v)
export const usdWhole = (v: number) => usd0.format(v)
export const num = (v: number) => int.format(v)
export const num1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const pct1 = (v: number) => `${v.toFixed(1)}%`
export const pct2 = (v: number) => `${v.toFixed(2)}%`
export const signedPct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`
