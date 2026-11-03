import { getKpis, type Kpi } from '../data/api'
import type { Filters } from '../data/filters'
import { num, pct1, signedPct, usdCompact, usdFull, usdWhole } from '../fmt'
import type { ResolvedPeriod } from '../periods'
import { InfoTip } from '../components/Card'

interface Tile {
  id: string
  label: string
  kpi: Kpi
  format: (v: number) => string
  /** Whether an increase is good. */
  upIsGood: boolean
}

function Change({ change, upIsGood }: { change: number | null; upIsGood: boolean }) {
  if (change == null) return <span className="text-xs text-faint">—</span>
  const flat = Math.abs(change) < 0.0005
  const good = flat ? null : change > 0 === upIsGood
  const color = good == null ? 'text-muted' : good ? 'text-good' : 'text-alert'
  return (
    <span className={`whitespace-nowrap text-xs font-medium ${color}`}>
      {flat ? '●' : change > 0 ? '▲' : '▼'} {signedPct(change)}
    </span>
  )
}

export function KpiStrip({ filters, period }: { filters: Filters; period: ResolvedPeriod }) {
  const k = getKpis(filters, period)
  const tiles: Tile[] = [
    { id: 'kpi.netWin', label: 'Net win', kpi: k.netWin, format: (v) => (v >= 1e5 ? usdCompact(v) : usdWhole(v)), upIsGood: true },
    { id: 'kpi.nwpd', label: 'NWPD / EGM', kpi: k.nwpd, format: usdFull, upIsGood: true },
    { id: 'kpi.uptime', label: 'Fleet uptime', kpi: k.uptime, format: pct1, upIsGood: true },
    { id: 'kpi.openCalls', label: 'Open calls', kpi: k.openCalls, format: num, upIsGood: false },
    { id: 'kpi.ftfr', label: 'First-time fix rate', kpi: k.ftfr, format: pct1, upIsGood: true },
  ]
  return (
    <div className="grid grid-cols-5 gap-3">
      {tiles.map((t) => (
        <div key={t.id} className="rounded-lg border border-line bg-card px-3 py-1.5">
          <div className="flex items-center justify-between">
            <span className="whitespace-nowrap text-xs font-medium text-muted" title="Change shown vs the previous equivalent period">
              {t.label}
            </span>
            <InfoTip id={t.id} align="left" />
          </div>
          <div className="-mt-1 flex items-baseline justify-between gap-2" title="Change vs the previous equivalent period">
            <span className="text-[22px] font-semibold leading-7 text-ink">{t.kpi.value == null ? '—' : t.format(t.kpi.value)}</span>
            <Change change={t.kpi.change} upIsGood={t.upIsGood} />
          </div>
        </div>
      ))}
    </div>
  )
}
