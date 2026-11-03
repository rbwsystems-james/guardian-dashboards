import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faChevronDown } from '@fortawesome/free-solid-svg-icons'

interface Props {
  label: string
  allLabel: string
  options: { id: number; name: string }[]
  selected: number[]
  onChange: (ids: number[]) => void
}

export function MultiSelect({ label, allLabel, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const visible = useMemo(() => options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())), [options, q])
  const text =
    selected.length === 0 ? allLabel : selected.length === 1 ? (options.find((o) => o.id === selected[0])?.name ?? '1 selected') : `${selected.length} selected`
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label} title={selected.length ? text : allLabel}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-[106px] items-center justify-between gap-1 rounded-md border bg-white px-2 text-left text-[13px] ${
          selected.length ? 'border-primary text-ink' : 'border-line text-muted'
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="text-[10px] uppercase text-faint">{label}</span>
        </span>
        <span className="max-w-[38px] truncate font-medium text-ink">{selected.length ? text : 'All'}</span>
        <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 text-faint" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-md border border-line bg-white py-1 shadow-lg">
          {options.length > 8 && (
            <div className="px-2 pb-1">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="h-7 w-full rounded border border-line px-2 text-[13px] outline-none focus:border-primary"
              />
            </div>
          )}
          <div className="flex items-center justify-between px-3 pb-1 text-xs text-muted">
            <span>{selected.length ? `${selected.length} selected` : allLabel}</span>
            {selected.length > 0 && (
              <button type="button" className="text-primary hover:underline" onClick={() => onChange([])}>
                Clear
              </button>
            )}
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto">
            {visible.map((o) => {
              const on = selected.includes(o.id)
              return (
                <li key={o.id} role="option" aria-selected={on}>
                  <button type="button" onClick={() => toggle(o.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-page">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-primary bg-primary text-white' : 'border-line bg-white'}`}>
                      {on && <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />}
                    </span>
                    <span className="truncate">{o.name}</span>
                  </button>
                </li>
              )
            })}
            {visible.length === 0 && <li className="px-3 py-2 text-xs text-faint">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
