// Shared catalog filtering for the customer home page and the admin list,
// plus URL round-tripping so a filtered view survives refresh and sharing.

import type { Product, StockStatus } from '../types'

export interface CatalogFilters {
  query: string
  sizes: string[]
  availability: StockStatus | null
  collection: string | null
}

export const emptyFilters: CatalogFilters = {
  query: '',
  sizes: [],
  availability: null,
  collection: null,
}

// Badge count for the funnel button (the query is visible in the search box,
// so it doesn't count).
export function countActiveFilters(f: CatalogFilters): number {
  return (f.sizes.length ? 1 : 0) + (f.availability ? 1 : 0) + (f.collection ? 1 : 0)
}

export function matchesQuery(p: Product, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [p.title, p.description, p.category, p.collection ?? ''].some((t) =>
    t.toLowerCase().includes(q),
  )
}

export function applyFilters(products: Product[], f: CatalogFilters): Product[] {
  return products.filter(
    (p) =>
      matchesQuery(p, f.query) &&
      // Free-size pieces (no size list — sarees, dupattas) fit everyone,
      // so they pass any size filter.
      (f.sizes.length === 0 || p.sizes.length === 0 || p.sizes.some((s) => f.sizes.includes(s))) &&
      (f.availability === null || p.stock_status === f.availability) &&
      (f.collection === null || p.collection === f.collection),
  )
}

const STATUSES: StockStatus[] = ['in_stock', 'sold_out', 'on_order']

export function filtersToParams(f: CatalogFilters, category: string | null): URLSearchParams {
  const params = new URLSearchParams()
  if (f.query) params.set('q', f.query)
  if (f.sizes.length) params.set('size', f.sizes.join(','))
  if (f.availability) params.set('avail', f.availability)
  if (f.collection) params.set('coll', f.collection)
  if (category) params.set('cat', category)
  return params
}

export function filtersFromParams(params: URLSearchParams): {
  filters: CatalogFilters
  category: string | null
} {
  const avail = params.get('avail') as StockStatus | null
  return {
    filters: {
      query: params.get('q') ?? '',
      sizes: params.get('size')?.split(',').filter(Boolean) ?? [],
      availability: avail && STATUSES.includes(avail) ? avail : null,
      collection: params.get('coll'),
    },
    category: params.get('cat'),
  }
}
