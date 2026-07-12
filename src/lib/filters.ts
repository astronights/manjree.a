// Shared catalog filtering for the customer home page and the admin list,
// plus URL round-tripping so a filtered view survives refresh and sharing.

import type { Product, StockStatus } from '../types'

// 'featured' keeps the shop's own arrangement: pinned pieces first, then
// newest — the order the store hands products out in.
export type SortOrder = 'featured' | 'newest' | 'price_asc' | 'price_desc'

export interface CatalogFilters {
  query: string
  sizes: string[]
  availability: StockStatus | null
  sort: SortOrder
  hideSeen: boolean
  onlySaved: boolean
  onlyEnquired: boolean
}

export const emptyFilters: CatalogFilters = {
  query: '',
  sizes: [],
  availability: null,
  sort: 'featured',
  hideSeen: false,
  onlySaved: false,
  onlyEnquired: false,
}

// Badge count for the funnel button (the query is visible in the search box,
// so it doesn't count).
export function countActiveFilters(f: CatalogFilters): number {
  return (
    (f.sizes.length ? 1 : 0) +
    (f.availability ? 1 : 0) +
    (f.sort !== 'featured' ? 1 : 0) +
    (f.hideSeen ? 1 : 0) +
    (f.onlySaved ? 1 : 0) +
    (f.onlyEnquired ? 1 : 0)
  )
}

export function matchesQuery(p: Product, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [p.title, p.description, p.category, p.collection ?? ''].some((t) =>
    t.toLowerCase().includes(q),
  )
}

export function applyFilters(products: Product[], f: CatalogFilters): Product[] {
  const result = products.filter(
    (p) =>
      matchesQuery(p, f.query) &&
      // Free-size pieces (no size list — sarees, dupattas) fit everyone,
      // so they pass any size filter.
      (f.sizes.length === 0 || p.sizes.length === 0 || p.sizes.some((s) => f.sizes.includes(s))) &&
      (f.availability === null || p.stock_status === f.availability),
  )
  switch (f.sort) {
    case 'newest':
      return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case 'price_asc':
      return result.sort((a, b) => a.price - b.price)
    case 'price_desc':
      return result.sort((a, b) => b.price - a.price)
    default:
      return result
  }
}

const STATUSES: StockStatus[] = ['in_stock', 'sold_out', 'on_order']
const SORTS: SortOrder[] = ['featured', 'newest', 'price_asc', 'price_desc']

export function filtersToParams(f: CatalogFilters, category: string | null): URLSearchParams {
  const params = new URLSearchParams()
  if (f.query) params.set('q', f.query)
  if (f.sizes.length) params.set('size', f.sizes.join(','))
  if (f.availability) params.set('avail', f.availability)
  if (f.sort !== 'featured') params.set('sort', f.sort)
  if (category) params.set('cat', category)
  if (f.hideSeen) params.set('hs', '1')
  if (f.onlySaved) params.set('os', '1')
  if (f.onlyEnquired) params.set('oe', '1')
  return params
}

export function filtersFromParams(params: URLSearchParams): {
  filters: CatalogFilters
  category: string | null
} {
  const avail = params.get('avail') as StockStatus | null
  const sort = params.get('sort') as SortOrder | null
  return {
    filters: {
      query: params.get('q') ?? '',
      sizes: params.get('size')?.split(',').filter(Boolean) ?? [],
      availability: avail && STATUSES.includes(avail) ? avail : null,
      sort: sort && SORTS.includes(sort) ? sort : 'featured',
      hideSeen: params.get('hs') === '1',
      onlySaved: params.get('os') === '1',
      onlyEnquired: params.get('oe') === '1',
    },
    category: params.get('cat'),
  }
}
