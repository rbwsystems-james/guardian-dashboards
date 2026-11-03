import { ChartCard, SelectControl } from '../components/Card'
import {
  getBottomSites,
  getCategoryNwpd,
  getDataset,
  getFloatTrend,
  getHeatmap,
  getLocationsEgms,
  getNwpdTrend,
  getRevenueTrend,
  getTopGames,
  getTopSites,
} from '../data/api'
import { setFilters, setParams, type DashState } from '../state'
import { usdCompact, usdFull, usdWhole } from '../fmt'
import * as O from '../charts/options'

export function Performance({ state }: { state: DashState }) {
  const { filters: f, resolved: p } = state
  const ds = getDataset()
  const dimOptions = ds.dimensions.map((d) => ({ value: d.key, label: d.label }))
  const dim = ds.dimensions.find((d) => d.key === state.p7)!

  const revenue = getRevenueTrend(f, p)
  const nwpd = getNwpdTrend(f, p)
  const locs = getLocationsEgms(f, p)
  const top = getTopSites(f, p)
  const bottom = getBottomSites(f, p)
  const games = getTopGames(f, p)
  const cats = getCategoryNwpd(f, p, state.p7)
  const heat = getHeatmap(f, p)
  const float = getFloatTrend(f, p)

  const pickSite = (rows: { siteId: number }[]) => (e: { dataIndex: number }) => {
    const r = rows[e.dataIndex]
    if (r) setFilters({ ...f, site: [r.siteId] })
  }

  return (
    <div className="grid grid-cols-12 gap-2.5">
      <ChartCard id="P1" title="Revenue" subtitle={p.trendSubtitle} span={4} empty={revenue.empty} option={O.barTrend(revenue, { name: 'Net win', axis: usdCompact, tip: usdFull })} />
      <ChartCard
        id="P2"
        title="NWPD / EGM"
        subtitle={p.trendSubtitle}
        span={4}
        empty={nwpd.empty}
        option={O.lineTrend(nwpd, { name: 'NWPD / EGM', axis: (v) => `$${Math.round(v)}`, tip: usdFull, avgLine: true })}
      />
      <ChartCard id="P3" title="Locations and EGMs" subtitle={p.trendSubtitle} span={4} empty={locs.empty} option={O.locationsEgms(locs)} />

      <ChartCard
        id="P4"
        title="Top 10 Locations by Net Revenue"
        subtitle={p.snapshotSubtitle}
        span={6}
        empty={!top.length}
        option={O.siteBars(top, 'netWin', usdCompact, usdFull, 'Net win')}
        onChartClick={pickSite(top)}
      />
      <ChartCard
        id="P5"
        title="Bottom 10 Locations by NWPD"
        subtitle={`${p.snapshotSubtitle} · sites with 14+ active days`}
        span={6}
        empty={!bottom.length}
        option={O.siteBars(bottom, 'nwpd', (v) => `$${Math.round(v)}`, usdFull, 'NWPD')}
        onChartClick={pickSite(bottom)}
      />

      <ChartCard id="P6" title="Top 5 Games" subtitle={`${p.snapshotSubtitle} · ranked by NWPD`} span={6} empty={!games.length} option={O.topGames(games)} />
      <ChartCard
        id="P7"
        title="Performance by Category"
        subtitle={`NWPD / EGM by ${dim.label.toLowerCase()} · ${p.snapshotSubtitle}`}
        span={6}
        empty={!cats.length}
        controls={<SelectControl label="Category" value={state.p7} options={dimOptions} onChange={(v) => setParams({ p7: v })} />}
        option={O.categoryBars(cats, { name: 'NWPD / EGM', axis: (v) => `$${Math.round(v)}`, tip: usdFull })}
      />

      <ChartCard id="P8" title="Play Heatmap" subtitle={`Net win per EGM-hour, day × hour · ${p.snapshotSubtitle}`} span={8} empty={heat.empty} option={O.heatmap(heat)} />
      <ChartCard id="P9" title="Total Float" subtitle={p.trendSubtitle} span={4} empty={float.empty} option={O.barTrend(float, { name: 'Total float', axis: usdCompact, tip: usdWhole })} />
    </div>
  )
}
