import { getDataset } from '../data/api'
import { filterOptions, hasFilters, pruneFilters, type Filters } from '../data/filters'
import { navigate, setFilters, type DashState } from '../state'
import { KpiStrip } from './KpiStrip'
import { MultiSelect } from './MultiSelect'
import { PeriodControl } from './PeriodControl'

const TABS = [
  { route: 'performance', label: 'Performance' },
  { route: 'service', label: 'Service' },
] as const

export function Header({ state }: { state: DashState }) {
  const ds = getDataset()
  const f = state.filters
  const opts = filterOptions(ds, f)
  const change = (patch: Partial<Filters>) => setFilters(pruneFilters(ds, { ...f, ...patch }))

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-page/95 px-4 pb-1.5 pt-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="tablist" aria-label="Dashboard" className="flex gap-0.5 rounded-lg bg-[#e1e3e8] p-0.5">
          {TABS.map((t) => {
            const on = state.route === t.route
            return (
              <button
                key={t.route}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => navigate(t.route)}
                className={`h-8 rounded-md px-2.5 text-[14px] ${on ? 'bg-white font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <MultiSelect label="Company" allLabel="All companies" options={opts.companies} selected={f.co} onChange={(co) => change({ co })} />
          <MultiSelect label="Operator" allLabel="All operators" options={opts.operators} selected={f.op} onChange={(op) => change({ op })} />
          <MultiSelect label="Region" allLabel="All regions" options={opts.regions} selected={f.reg} onChange={(reg) => change({ reg })} />
          <MultiSelect label="Site" allLabel="All sites" options={opts.sites} selected={f.site} onChange={(site) => change({ site })} />
          {hasFilters(f) && (
            <button type="button" onClick={() => setFilters({ co: [], op: [], reg: [], site: [] })} className="whitespace-nowrap text-[13px] text-primary hover:underline">
              Clear
            </button>
          )}
        </div>

        <div className="ml-auto">
          <PeriodControl period={state.period} />
        </div>
      </div>

      <div className="mt-2">
        <KpiStrip filters={f} period={state.resolved} />
      </div>
      <p className="-mx-4 -mb-1.5 mt-1.5 bg-[#fff4d6] py-px text-center text-[11px] text-[#7a5b00]">Mockup – synthetic data for layout review only</p>
    </div>
  )
}
