import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { LAST_IDX, addMonths, fmtUS, idxToISO, isoToIdx, monthLabel } from '../dates'
import { FIRST_MONTH, LAST_MONTH, weekOptions, type PeriodMode, type PeriodSel } from '../periods'
import { setPeriod } from '../state'

const MODES: { value: PeriodMode; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'range', label: 'Range' },
]

function Arrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir < 0 ? 'Previous' : 'Next'}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-7 items-center justify-center rounded-md border border-line bg-white text-muted enabled:hover:bg-page disabled:opacity-40"
    >
      <FontAwesomeIcon icon={dir < 0 ? faChevronLeft : faChevronRight} className="h-3 w-3" />
    </button>
  )
}

const selectCls = 'h-8 rounded-md border border-line bg-white px-2 text-[13px] text-ink'

export function PeriodControl({ period }: { period: PeriodSel }) {
  const months: string[] = []
  for (let k = FIRST_MONTH; k <= LAST_MONTH; k = addMonths(k, 1)) months.push(k)
  const weeks = weekOptions()
  const wIdx = weeks.indexOf(isoToIdx(period.week))
  const mIdx = months.indexOf(period.month)

  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Period type" className="inline-flex overflow-hidden rounded-md border border-line bg-white">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setPeriod({ mode: m.value })}
            className={`h-8 px-2.5 text-[13px] ${period.mode === m.value ? 'bg-primary font-medium text-white' : 'text-muted hover:bg-page'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {period.mode === 'month' && (
        <div className="flex items-center gap-1">
          <Arrow dir={-1} disabled={mIdx <= 0} onClick={() => setPeriod({ month: months[mIdx - 1] })} />
          <select aria-label="Month" className={`${selectCls} w-[124px]`} value={period.month} onChange={(e) => setPeriod({ month: e.target.value })}>
            {months.slice().reverse().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m, true)}
              </option>
            ))}
          </select>
          <Arrow dir={1} disabled={mIdx < 0 || mIdx >= months.length - 1} onClick={() => setPeriod({ month: months[mIdx + 1] })} />
        </div>
      )}

      {period.mode === 'week' && (
        <div className="flex items-center gap-1">
          <Arrow dir={-1} disabled={wIdx <= 0} onClick={() => setPeriod({ week: idxToISO(weeks[wIdx - 1]) })} />
          <select aria-label="Week" className={`${selectCls} w-[170px]`} value={period.week} onChange={(e) => setPeriod({ week: e.target.value })}>
            {weeks.slice().reverse().map((w) => (
              <option key={w} value={idxToISO(w)}>
                {fmtUS(w)} – {fmtUS(w + 6)}
              </option>
            ))}
          </select>
          <Arrow dir={1} disabled={wIdx < 0 || wIdx >= weeks.length - 1} onClick={() => setPeriod({ week: idxToISO(weeks[wIdx + 1]) })} />
        </div>
      )}

      {period.mode === 'range' && (
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          <input aria-label="Start date" type="date" className={selectCls} min={idxToISO(0)} max={period.to} value={period.from} onChange={(e) => e.target.value && setPeriod({ from: e.target.value })} />
          <span>to</span>
          <input aria-label="End date" type="date" className={selectCls} min={period.from} max={idxToISO(LAST_IDX)} value={period.to} onChange={(e) => e.target.value && setPeriod({ to: e.target.value })} />
        </div>
      )}
    </div>
  )
}
