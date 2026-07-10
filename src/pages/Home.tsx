import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSettings } from '../lib/settings'
import { listProducts, isNew } from '../lib/store'
import {
  applyFilters,
  countActiveFilters,
  filtersFromParams,
  filtersToParams,
} from '../lib/filters'
import type { CatalogFilters } from '../lib/filters'
import FilterSheet from '../components/FilterSheet'
import ProductCard from '../components/ProductCard'
import type { Product } from '../types'

// Sentinel tab that filters by "currently new" rather than by category.
const NEW_TAB = 'New Arrivals'

const AVAILABILITY_LABEL = { in_stock: 'In stock', sold_out: 'Sold out', on_order: 'On order' }

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => filtersFromParams(searchParams), [])
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(initial.category)
  const [filters, setFilters] = useState<CatalogFilters>(initial.filters)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [settingsCategories, setSettingsCategories] = useState<string[]>([])
  const [settingsSizes, setSettingsSizes] = useState<string[]>([])

  useEffect(() => {
    listProducts()
      .then((list) => {
        setProducts(list)
        // Land on New Arrivals when there are any; otherwise on All.
        setCategory((prev) => prev ?? (list.some(isNew) ? NEW_TAB : 'All'))
      })
      .catch((e: Error) => setError(e.message))
    getSettings()
      .then((s) => {
        setSettingsCategories(s.categories)
        setSettingsSizes(s.sizes)
      })
      .catch(() => {})
  }, [])

  const hasNew = useMemo(() => (products ?? []).some(isNew), [products])
  const defaultTab = hasNew ? NEW_TAB : 'All'

  // Keep the URL shareable/refreshable (the default tab is left out of it).
  useEffect(() => {
    if (!products || category === null) return
    setSearchParams(filtersToParams(filters, category === defaultTab ? null : category), {
      replace: true,
    })
  }, [filters, category, products, defaultTab, setSearchParams])

  const collections = useMemo(
    () => [...new Set((products ?? []).map((p) => p.collection).filter((c): c is string => Boolean(c)))],
    [products],
  )
  const filtered = useMemo(() => {
    const inTab = (products ?? []).filter((p) =>
      category === NEW_TAB ? isNew(p) : category === 'All' || !category || p.category === category,
    )
    return applyFilters(inTab, filters)
  }, [products, category, filters])
  // New Arrivals (while any exist), then All, then the configured categories
  // plus any legacy ones still in use on pieces.
  const categoryChips = useMemo(() => {
    const inUse = [...new Set((products ?? []).map((p) => p.category))]
    return [
      ...(hasNew ? [NEW_TAB] : []),
      'All',
      ...settingsCategories,
      ...inUse.filter((c) => !settingsCategories.includes(c)),
    ]
  }, [products, settingsCategories, hasNew])

  const patchFilters = (patch: Partial<CatalogFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const activeCount = countActiveFilters(filters)
  const anyNarrowing = activeCount > 0 || filters.query.trim() !== ''

  if (error) {
    return <p className="p-8 text-center text-sm text-bougainvillea-500">Could not load the catalog: {error}</p>
  }
  if (!products) {
    return <p className="p-8 text-center text-sm text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <div className="flex gap-2 pt-5">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3.5 dark:border-night-700 dark:bg-night-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-night-700/80 dark:text-cream-300/60">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => patchFilters({ query: e.target.value })}
            placeholder="Search kurtis, sarees…"
            className="w-full bg-transparent py-2.5 text-[15px] text-night-800 outline-none placeholder:text-night-700/60 dark:text-cream-100 dark:placeholder:text-cream-300/50"
          />
        </label>
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Filters"
          className="relative rounded-xl border border-cream-300 bg-cream-50 px-3.5 text-night-700 transition hover:bg-cream-200 dark:border-night-700 dark:bg-night-800 dark:text-cream-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bougainvillea-500 px-1 text-xs font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {activeCount > 0 && (
        <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
          {filters.sizes.map((s) => (
            <button
              key={s}
              onClick={() => patchFilters({ sizes: filters.sizes.filter((x) => x !== s) })}
              className="shrink-0 rounded-full bg-night-800 px-3 py-1 text-xs font-medium text-cream-100 dark:bg-cream-200 dark:text-night-900"
            >
              Size {s} ✕
            </button>
          ))}
          {filters.availability && (
            <button
              onClick={() => patchFilters({ availability: null })}
              className="shrink-0 rounded-full bg-night-800 px-3 py-1 text-xs font-medium text-cream-100 dark:bg-cream-200 dark:text-night-900"
            >
              {AVAILABILITY_LABEL[filters.availability]} ✕
            </button>
          )}
          {filters.collection && (
            <button
              onClick={() => patchFilters({ collection: null })}
              className="shrink-0 rounded-full bg-night-800 px-3 py-1 text-xs font-medium text-cream-100 dark:bg-cream-200 dark:text-night-900"
            >
              ✦ {filters.collection} ✕
            </button>
          )}
        </div>
      )}

      <section className="pt-4">
        {collections.length > 0 && (
          <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {collections.map((c) => (
              <button
                key={c}
                onClick={() => patchFilters({ collection: filters.collection === c ? null : c })}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  filters.collection === c
                    ? 'border-marigold-500 bg-marigold-400 text-night-900'
                    : 'border-marigold-400/60 bg-marigold-50 text-marigold-700 hover:bg-marigold-100 dark:border-marigold-600 dark:bg-night-800 dark:text-marigold-300'
                }`}
              >
                ✦ {c}
              </button>
            ))}
          </div>
        )}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {categoryChips.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                category === c
                  ? 'bg-night-800 text-cream-100 dark:bg-marigold-400 dark:text-night-900'
                  : c === NEW_TAB
                    ? 'bg-marigold-100 text-marigold-700 hover:bg-marigold-300 dark:bg-night-800 dark:text-marigold-300 dark:hover:bg-night-700'
                    : 'bg-cream-200 text-night-700 hover:bg-cream-300 dark:bg-night-800 dark:text-cream-200 dark:hover:bg-night-700'
              }`}
            >
              {c === NEW_TAB ? `✨ ${c}` : c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-night-700/80 dark:text-cream-300/60">
              {anyNarrowing ? 'Nothing matches your search and filters.' : 'No pieces here yet — check back soon!'}
            </p>
            {anyNarrowing && (
              <button
                onClick={() => setFilters({ query: '', sizes: [], availability: null, collection: null })}
                className="mt-3 rounded-full bg-marigold-400 px-4 py-1.5 text-sm font-semibold text-night-900 transition hover:bg-marigold-300"
              >
                Clear search & filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={patchFilters}
        sizes={settingsSizes}
        collections={collections}
      />
    </main>
  )
}
