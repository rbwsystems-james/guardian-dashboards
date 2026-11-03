import { describe, expect, it } from 'vitest'
import { N_DAYS, DATA_END_H } from '../dates'
import { generateDataset } from './generate'

const ds = generateDataset()

describe('synthetic data', () => {
  it('is deterministic for a given seed', () => {
    const again = generateDataset()
    expect(again.calls.length).toBe(ds.calls.length)
    expect(again.cum.netWin[again.cum.netWin.length - 1]).toBe(ds.cum.netWin[ds.cum.netWin.length - 1])
  })

  it('has the expected scale and plausible rates', () => {
    const activeAtEnd = ds.egms.filter((e) => e.installIdx <= N_DAYS - 1 && e.removeIdx >= N_DAYS - 1).length
    const last30 = (arr: Float64Array, stride = ds.cum.stride) => {
      let s = 0
      for (let e = 0; e < ds.egms.length; e++) s += arr[e * stride + N_DAYS] - arr[e * stride + N_DAYS - 30]
      return s
    }
    const nwpd = last30(ds.cum.netWin) / last30(ds.cum.active)
    const uptime = (1 - last30(ds.cum.downtime) / (last30(ds.cum.active) * 24)) * 100
    const open = ds.calls.filter((c) => c.closedH == null).length
    const auto = ds.calls.filter((c) => c.source === 'auto').length / ds.calls.length
    const res = ds.calls.filter((c) => c.closedH != null).map((c) => c.closedH! - c.loggedH).sort((a, b) => a - b)
    const stats = {
      sites: ds.sites.length, egms: ds.egms.length, activeAtEnd, calls: ds.calls.length, open,
      nwpd: +nwpd.toFixed(1), uptime: +uptime.toFixed(2), auto: +auto.toFixed(2),
      medianRes: +res[res.length >> 1].toFixed(1), meanRes: +(res.reduce((a, b) => a + b, 0) / res.length).toFixed(1),
      callsPer100PerWeek: +((ds.calls.length / (730 / 7) / activeAtEnd) * 100).toFixed(1),
    }
    console.log(JSON.stringify(stats))
    expect(activeAtEnd).toBeGreaterThan(850)
    expect(activeAtEnd).toBeLessThan(1150)
    expect(nwpd).toBeGreaterThan(70)
    expect(nwpd).toBeLessThan(130)
    expect(uptime).toBeGreaterThan(96.5)
    expect(uptime).toBeLessThan(99.5)
    expect(auto).toBeGreaterThan(0.55)
    expect(auto).toBeLessThan(0.65)
    expect(open).toBeGreaterThan(10)
    expect(DATA_END_H).toBe(N_DAYS * 24)
  })
})
