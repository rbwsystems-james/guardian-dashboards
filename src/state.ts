import { useMemo, useSyncExternalStore } from 'react'
import { getDataset } from './data/api'
import { EMPTY_FILTERS, pruneFilters, type Filters } from './data/filters'
import { DIM_KEYS, type DimKey } from './data/types'
import { DEFAULT_PERIOD, resolvePeriod, type PeriodMode, type PeriodSel, type ResolvedPeriod } from './periods'

// Period, filters and chart choices live in the hash query so a shared link restores the exact view.

export type Route = 'performance' | 'service'
export type Basis = 'raw' | 'per100'

export interface DashState {
  route: Route
  period: PeriodSel
  resolved: ResolvedPeriod
  filters: Filters
  p7: DimKey
  s7: DimKey
  s3: Basis
  s7basis: Basis
}

const EVENT = 'dashstate'

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener('hashchange', cb)
    window.removeEventListener(EVENT, cb)
  }
}
const snapshot = () => window.location.hash

function parseHash(hash: string): { route: Route; q: URLSearchParams } {
  const raw = hash.replace(/^#/, '')
  const [path, query = ''] = raw.split('?')
  return { route: path.replace(/^\//, '') === 'service' ? 'service' : 'performance', q: new URLSearchParams(query) }
}

const ids = (v: string | null) => (v ? v.split(',').map(Number).filter((n) => Number.isFinite(n)) : [])
const oneOf = <T extends string>(v: string | null, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d)

export function useDashState(): DashState {
  const hash = useSyncExternalStore(subscribe, snapshot)
  return useMemo(() => {
    const { route, q } = parseHash(hash)
    const period: PeriodSel = {
      mode: oneOf<PeriodMode>(q.get('mode'), ['week', 'month', 'range'], DEFAULT_PERIOD.mode),
      month: /^\d{4}-\d{2}$/.test(q.get('m') ?? '') ? q.get('m')! : DEFAULT_PERIOD.month,
      week: /^\d{4}-\d{2}-\d{2}$/.test(q.get('w') ?? '') ? q.get('w')! : DEFAULT_PERIOD.week,
      from: /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') ?? '') ? q.get('from')! : DEFAULT_PERIOD.from,
      to: /^\d{4}-\d{2}-\d{2}$/.test(q.get('to') ?? '') ? q.get('to')! : DEFAULT_PERIOD.to,
    }
    const filters = pruneFilters(getDataset(), { ...EMPTY_FILTERS, co: ids(q.get('co')), op: ids(q.get('op')), reg: ids(q.get('reg')), site: ids(q.get('site')) })
    return {
      route,
      period,
      resolved: resolvePeriod(period),
      filters,
      p7: oneOf(q.get('p7'), DIM_KEYS, 'manufacturer'),
      s7: oneOf(q.get('s7'), DIM_KEYS, 'manufacturer'),
      s3: oneOf<Basis>(q.get('s3'), ['raw', 'per100'], 'raw'),
      s7basis: oneOf<Basis>(q.get('s7b'), ['raw', 'per100'], 'per100'),
    }
  }, [hash])
}

function write(route: Route, q: URLSearchParams, push: boolean) {
  const str = q.toString()
  const url = `#/${route}${str ? `?${str}` : ''}`
  if (push) window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
  window.dispatchEvent(new Event(EVENT))
}

/** Update one or more query params in place (null removes). */
export function setParams(patch: Record<string, string | null>) {
  const { route, q } = parseHash(window.location.hash)
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') q.delete(k)
    else q.set(k, v)
  }
  write(route, q, false)
}

export function setFilters(f: Filters) {
  const j = (a: number[]) => (a.length ? a.join(',') : null)
  setParams({ co: j(f.co), op: j(f.op), reg: j(f.reg), site: j(f.site) })
}

export function navigate(route: Route) {
  const { q } = parseHash(window.location.hash)
  write(route, q, true)
}

export function setPeriod(patch: Partial<PeriodSel>) {
  const map: Record<string, string> = { mode: 'mode', month: 'm', week: 'w', from: 'from', to: 'to' }
  const out: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(patch)) out[map[k]] = v as string
  setParams(out)
}
