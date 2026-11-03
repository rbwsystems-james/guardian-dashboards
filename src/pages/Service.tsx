import { Card, ChartCard, EmptyState, SelectControl, Toggle } from '../components/Card'
import {
  getBacklog,
  getCallsByCategory,
  getCallsTrend,
  getDataset,
  getFtfrTrend,
  getRepeatOffenders,
  getResolutionTrend,
  getRevenueLostTrend,
  getTechnicians,
  getTopIssues,
  getUptimeTrend,
} from '../data/api'
import { CONFIG } from '../config'
import { setFilters, setParams, type DashState } from '../state'
import { num1, usdCompact, usdFull } from '../fmt'
import * as O from '../charts/options'

const BASIS = [
  { value: 'raw', label: 'Raw' },
  { value: 'per100', label: 'Per 100 EGMs' },
] as const

export function Service({ state }: { state: DashState }) {
  const { filters: f, resolved: p } = state
  const ds = getDataset()
  const dimOptions = ds.dimensions.map((d) => ({ value: d.key, label: d.label }))
  const dim = ds.dimensions.find((d) => d.key === state.s7)!

  const uptime = getUptimeTrend(f, p)
  const lost = getRevenueLostTrend(f, p)
  const calls = getCallsTrend(f, p, state.s3 === 'per100')
  const issues = getTopIssues(f, p)
  const res = getResolutionTrend(f, p)
  const ftfr = getFtfrTrend(f, p)
  const byCat = getCallsByCategory(f, p, state.s7, state.s7basis === 'per100')
  const backlog = getBacklog(f, p)
  const offenders = getRepeatOffenders(f, p)
  const techs = getTechnicians(f, p)

  const per100 = state.s7basis === 'per100'

  return (
    <div className="grid grid-cols-12 gap-2.5">
      <ChartCard
        id="S1"
        title="Fleet Uptime"
        subtitle={`${p.trendSubtitle} · target ${CONFIG.UPTIME_TARGET}%`}
        span={4}
        empty={uptime.empty}
        option={O.lineTrend(uptime, { name: 'Fleet uptime', axis: (v) => `${v}%`, tip: (v) => `${v.toFixed(2)}%`, min: 90, max: 100, target: { value: CONFIG.UPTIME_TARGET, label: `Target ${CONFIG.UPTIME_TARGET}%` } })}
      />
      <ChartCard
        id="S2"
        title="Revenue Lost to Downtime"
        subtitle={`${p.trendSubtitle} · estimate`}
        span={4}
        empty={lost.empty}
        option={O.barTrend(lost, { name: 'Revenue lost', axis: usdCompact, tip: usdFull, color: undefined, extra: (i) => `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#667085">Downtime hours</span><b>${Math.round(lost.hours[i] ?? 0).toLocaleString('en-US')} h</b></div>` })}
      />
      <ChartCard
        id="S3"
        title="Service Calls"
        subtitle={p.trendSubtitle}
        span={4}
        empty={calls.empty}
        controls={<Toggle label="Basis" value={state.s3} options={[...BASIS]} onChange={(v) => setParams({ s3: v })} />}
        option={O.lineTrend(calls, { name: state.s3 === 'per100' ? 'Calls per 100 EGMs' : 'Calls', axis: (v) => (state.s3 === 'per100' ? v.toFixed(1) : String(Math.round(v))), tip: (v) => (state.s3 === 'per100' ? v.toFixed(1) : String(Math.round(v))), min: 0 })}
      />

      <ChartCard id="S4" title="Top 5 Issues" subtitle={`${p.snapshotSubtitle} · top 5 cover ${(issues.coverage * 100).toFixed(0)}% of calls`} span={4} empty={issues.empty} option={O.pie(issues)} />
      <ChartCard id="S5" title="Resolution Time" subtitle={`${p.trendSubtitle} · hours, logged to closed`} span={4} empty={res.empty} option={O.resolution(res)} />
      <ChartCard
        id="S6"
        title="First-Time Fix Rate"
        subtitle={`${p.trendSubtitle} · 7-day window`}
        span={4}
        empty={ftfr.empty}
        option={O.lineTrend(ftfr, { name: 'First-time fix rate', axis: (v) => `${Math.round(v)}%`, tip: (v) => `${v.toFixed(1)}%`, min: 'dataMin', max: 100 })}
      />

      <ChartCard
        id="S7"
        title="Calls by Category"
        subtitle={`${per100 ? 'Calls per 100 EGMs' : 'Calls'} by ${dim.label.toLowerCase()} · ${p.snapshotSubtitle}`}
        span={8}
        empty={!byCat.length}
        controls={
          <>
            <SelectControl label="Category" value={state.s7} options={dimOptions} onChange={(v) => setParams({ s7: v })} />
            <Toggle label="Basis" value={state.s7basis} options={[...BASIS]} onChange={(v) => setParams({ s7b: v })} />
          </>
        }
        option={O.categoryBars(byCat, { name: per100 ? 'Calls per 100 EGMs' : 'Calls', axis: (v) => (per100 ? v.toFixed(1) : String(Math.round(v))), tip: (v) => (per100 ? v.toFixed(1) : String(Math.round(v))) })}
      />
      <ChartCard id="S8" title="Open Call Backlog" subtitle={`Open calls by age at ${p.snapshotSubtitle.split(' – ').pop()} · ${backlog.total} open`} span={4} option={O.backlog(backlog)} />

      <Card id="S9" title="Repeat-Offender Machines" subtitle="Top 10 assets by calls · 90 days to period end (ignores the period length)" span={7}>
        {offenders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden">
            <table className="w-full table-fixed border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-line text-[11px] text-muted">
                  <th className="w-[14%] px-2 py-1 font-medium">Asset ID</th>
                  <th className="w-[21%] px-2 py-1 font-medium">Site</th>
                  <th className="w-[16%] px-2 py-1 font-medium">Manufacturer</th>
                  <th className="w-[12%] px-2 py-1 font-medium">Cabinet</th>
                  <th className="w-[7%] px-2 py-1 text-right font-medium">Calls</th>
                  <th className="w-[18%] px-2 py-1 font-medium">Top issue</th>
                  <th className="w-[12%] px-2 py-1 text-right font-medium">Downtime h</th>
                </tr>
              </thead>
              <tbody>
                {offenders.map((r) => (
                  <tr key={r.asset} className="border-b border-line/60 last:border-0 hover:bg-page">
                    <td className="px-2 py-1 font-medium text-ink">{r.asset}</td>
                    <td className="truncate px-2 py-1">
                      <button type="button" title="Filter to this site" className="max-w-full truncate text-primary hover:underline" onClick={() => setFilters({ ...f, site: [r.siteId] })}>
                        {r.site}
                      </button>
                    </td>
                    <td className="truncate px-2 py-1">{r.manufacturer}</td>
                    <td className="truncate px-2 py-1">{r.cabinet}</td>
                    <td className="px-2 py-1 text-right font-semibold text-ink">{r.calls}</td>
                    <td className="truncate px-2 py-1">{r.topIssue}</td>
                    <td className="px-2 py-1 text-right">{num1(r.downtime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ChartCard id="S10" title="Calls by Technician" subtitle={`Calls closed · ${p.snapshotSubtitle}`} span={5} empty={!techs.length} option={O.techBars(techs)} />
    </div>
  )
}
