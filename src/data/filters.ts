import type { Company, Dataset, Operator, Region, Site } from './types'

export interface Filters {
  co: number[]
  op: number[]
  reg: number[]
  site: number[]
}

export const EMPTY_FILTERS: Filters = { co: [], op: [], reg: [], site: [] }

export const hasFilters = (f: Filters) => f.co.length + f.op.length + f.reg.length + f.site.length > 0

export interface FilterOptions {
  companies: Company[]
  operators: Operator[]
  regions: Region[]
  sites: Site[]
}

/** Company → Operator → Region → Site. Selecting a parent narrows the child lists. */
export function filterOptions(ds: Dataset, f: Filters): FilterOptions {
  const operators = ds.operators.filter((o) => !f.co.length || f.co.includes(o.companyId))
  const opIds = f.op.length ? f.op.filter((id) => operators.some((o) => o.id === id)) : operators.map((o) => o.id)
  const regions = ds.regions.filter((r) => opIds.includes(r.operatorId))
  const regIds = f.reg.length ? f.reg.filter((id) => regions.some((r) => r.id === id)) : regions.map((r) => r.id)
  const sites = ds.sites.filter((s) => regIds.includes(s.regionId)).sort((a, b) => a.name.localeCompare(b.name))
  return { companies: ds.companies, operators, regions, sites }
}

/** Drop any selected child values that are no longer valid under the selected parents. */
export function pruneFilters(ds: Dataset, f: Filters): Filters {
  const operators = ds.operators.filter((o) => !f.co.length || f.co.includes(o.companyId))
  const op = f.op.filter((id) => operators.some((o) => o.id === id))
  const opIds = op.length ? op : operators.map((o) => o.id)
  const regions = ds.regions.filter((r) => opIds.includes(r.operatorId))
  const reg = f.reg.filter((id) => regions.some((r) => r.id === id))
  const regIds = reg.length ? reg : regions.map((r) => r.id)
  const site = f.site.filter((id) => regIds.includes(ds.sites[id]?.regionId))
  return { co: f.co, op, reg, site }
}

export function filtersKey(f: Filters): string {
  return `${f.co.join('.')}|${f.op.join('.')}|${f.reg.join('.')}|${f.site.join('.')}`
}
