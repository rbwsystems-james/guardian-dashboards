import { describe, expect, it } from 'vitest'
import {
  downtimeHours,
  ftfr,
  isFirstTimeFix,
  isFtfrEligible,
  isOpenAt,
  mergeWindows,
  nwpd,
  pctChange,
  revenueLost,
  uptimePct,
} from './metrics'

describe('NWPD', () => {
  it('is net win divided by EGM-days', () => {
    expect(nwpd(9000, 100)).toBe(90)
  })
  it('is null with no EGM-days', () => {
    expect(nwpd(500, 0)).toBeNull()
  })
})

describe('downtime overlap merging', () => {
  it('counts overlapping calls on one asset once', () => {
    expect(mergeWindows([[0, 10], [5, 12], [20, 25]])).toEqual([[0, 12], [20, 25]])
    expect(downtimeHours([[0, 10], [5, 12], [20, 25]], 0, 100)).toBe(17)
  })
  it('merges touching and nested windows', () => {
    expect(mergeWindows([[0, 10], [10, 20], [2, 4]])).toEqual([[0, 20]])
  })
  it('clips to the period', () => {
    expect(downtimeHours([[-5, 5], [90, 120]], 0, 100)).toBe(15)
  })
})

describe('fleet uptime', () => {
  it('is 1 − downtime ÷ (EGM-days × 24)', () => {
    // 10 EGMs × 10 days = 100 EGM-days = 2400 hours; 48 down → 98%
    expect(uptimePct(48, 100)).toBeCloseTo(98, 10)
  })
  it('is null with no EGM-days', () => {
    expect(uptimePct(0, 0)).toBeNull()
  })
})

describe('revenue lost to downtime', () => {
  it('sums downtime hours × (asset NWPD ÷ 24)', () => {
    const lost = revenueLost([
      { downtimeHours: 12, nwpd30: 120 }, // 60
      { downtimeHours: 24, nwpd30: 48 }, // 48
    ])
    expect(lost).toBeCloseTo(108, 10)
  })
})

describe('first-time fix', () => {
  const day = 24
  const dataEndH = 100 * day
  it('is eligible only if closed in the period and ≥7 days before data end', () => {
    expect(isFtfrEligible(50 * day, 40 * day, 60 * day, dataEndH)).toBe(true)
    expect(isFtfrEligible(39 * day, 40 * day, 60 * day, dataEndH)).toBe(false) // before period
    expect(isFtfrEligible(60 * day, 40 * day, 60 * day, dataEndH)).toBe(false) // after period
    expect(isFtfrEligible(93 * day, 90 * day, 100 * day, dataEndH)).toBe(true) // exactly 7 days before end
    expect(isFtfrEligible(93 * day + 1, 90 * day, 100 * day, dataEndH)).toBe(false) // window not yet run
    expect(isFtfrEligible(null, 0, dataEndH, dataEndH)).toBe(false)
  })
  it('fails when the same asset and category recurs within 7 days', () => {
    const a = { assetId: 1, categoryId: 2, loggedH: 0, closedH: 10 }
    const repeat = { assetId: 1, categoryId: 2, loggedH: 10 + 3 * 24, closedH: 90 }
    const other = { assetId: 1, categoryId: 3, loggedH: 12, closedH: 20 }
    const late = { assetId: 1, categoryId: 2, loggedH: 10 + 8 * 24, closedH: 300 }
    expect(isFirstTimeFix(a, [a, repeat])).toBe(false)
    expect(isFirstTimeFix(a, [a, other])).toBe(true)
    expect(isFirstTimeFix(a, [a, late])).toBe(true)
  })
  it('computes the rate', () => {
    expect(ftfr(8, 10)).toBe(80)
    expect(ftfr(0, 0)).toBeNull()
  })
})

describe('open calls and change', () => {
  it('counts calls logged on or before and not closed by the time', () => {
    expect(isOpenAt({ loggedH: 5, closedH: null }, 10)).toBe(true)
    expect(isOpenAt({ loggedH: 5, closedH: 8 }, 10)).toBe(false)
    expect(isOpenAt({ loggedH: 11, closedH: null }, 10)).toBe(false)
  })
  it('period-over-period change', () => {
    expect(pctChange(110, 100)).toBeCloseTo(0.1, 10)
    expect(pctChange(50, 0)).toBeNull()
  })
})
