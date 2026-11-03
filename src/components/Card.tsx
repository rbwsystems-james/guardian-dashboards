import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import type { EChartsOption } from 'echarts'
import { DEFS } from '../defs'
import { Chart, CHART_HEIGHT } from './Chart'

export function InfoTip({ id, align = 'right' }: { id: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label="Metric definition"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-page hover:text-muted"
      >
        <FontAwesomeIcon icon={faCircleInfo} className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="tooltip"
          className={`absolute top-full z-30 mt-1 w-72 rounded-md border border-line bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed text-ink shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {DEFS[id]}
        </div>
      )}
    </span>
  )
}

interface CardProps {
  id: string
  title: string
  subtitle: string
  /** Column span out of 12 */
  span: number
  controls?: ReactNode
  children: ReactNode
}

const SPAN: Record<number, string> = { 4: 'col-span-4', 5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8' }

export function Card({ id, title, subtitle, span, controls, children }: CardProps) {
  return (
    <section className={`${SPAN[span]} flex min-w-0 flex-col rounded-lg border border-line bg-card`} data-card={id}>
      <header className="flex items-start justify-between gap-2 px-3 pt-2">
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-semibold text-ink">{title}</h2>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {controls}
          <InfoTip id={id} />
        </div>
      </header>
      <div className="px-1 pb-1">{children}</div>
    </section>
  )
}

export function EmptyState() {
  return (
    <div className="flex items-center justify-center text-sm text-faint" style={{ height: CHART_HEIGHT }}>
      No data for the current filters
    </div>
  )
}

interface ChartCardProps extends Omit<CardProps, 'children'> {
  option: EChartsOption
  empty?: boolean
  onChartClick?: (p: { dataIndex: number; name?: string }) => void
}

export function ChartCard({ option, empty, onChartClick, ...card }: ChartCardProps) {
  return (
    <Card {...card}>
      {empty ? <EmptyState /> : <Chart option={option} onClick={onChartClick} />}
    </Card>
  )
}

/** Small native select / segmented controls used in card headers. */
export function SelectControl<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className="h-6 rounded border border-line bg-white px-1 text-xs text-ink">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded border border-line text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-6 px-2 ${value === o.value ? 'bg-primary text-white' : 'bg-white text-muted hover:bg-page'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
