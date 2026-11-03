export type SiteType = 'bar' | 'restaurant' | 'truck stop' | 'convenience store'

export interface Company { id: number; name: string }
export interface Operator { id: number; companyId: number; name: string }
export interface Region { id: number; operatorId: number; name: string }

export interface Site {
  id: number
  name: string
  regionId: number
  type: SiteType
  /** Day index the site opened (negative = before the data window). */
  openIdx: number
  /** Last day index the site traded, or null. */
  closeIdx: number | null
  quality: number
  egmIds: number[]
}

export const DIM_KEYS = ['manufacturer', 'cabinet', 'gamePack', 'validator', 'supplier'] as const
export type DimKey = (typeof DIM_KEYS)[number]
export interface Dimension { key: DimKey; label: string; values: readonly string[] }

export interface Egm {
  id: number
  code: string
  siteId: number
  /** Value index per dimension, ordered as DIM_KEYS. */
  dims: number[]
  installIdx: number
  /** Last active day index (inclusive). */
  removeIdx: number
  gameIds: number[]
  /** Share of play per game (sums to 1). */
  gameW: number[]
  /** Share of net win per game (sums to 1). */
  gameNw: number[]
  /** Share of coin-in per game (sums to 1). */
  gameCoin: number[]
}

export interface Game { id: number; name: string; pack: number }

export interface Call {
  id: number
  egmId: number
  categoryId: number
  source: 'auto' | 'manual'
  loggedH: number
  closedH: number | null
  techId: number
}

export interface Technician { id: number; name: string; regionId: number }

/** Per-EGM cumulative sums, stride N_DAYS + 1: value at [e * stride + d] is the sum over days < d. */
export interface Cumulative {
  netWin: Float64Array
  coinIn: Float64Array
  plays: Float64Array
  active: Float64Array
  downtime: Float64Array
  stride: number
}

export interface Dataset {
  companies: Company[]
  operators: Operator[]
  regions: Region[]
  sites: Site[]
  egms: Egm[]
  games: Game[]
  dimensions: Dimension[]
  categories: string[]
  technicians: Technician[]
  calls: Call[]
  callsByEgm: Call[][]
  cum: Cumulative
  /** Site float per week index (weeks counted from the data start). */
  floatBySite: Float32Array[]
}
