import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSettings, defaultOrdering } from '../lib/settings'
import { listProducts, isNew } from '../lib/store'
import {
  applyFilters,
  countActiveFilters,
  emptyFilters,
  filtersFromParams,
  filtersToParams,
} from '../lib/filters'
import type { CatalogFilters } from '../lib/filters'
import FilterSheet, { SORT_LABELS } from '../components/FilterSheet'
import { fetchEngagement, recordFilterUse } from '../lib/analytics'
import { favoriteIds } from '../lib/favorites'
import { enquiredIds } from '../lib/enquiries'
import { orderProducts } from '../lib/order'
import { resolveStrategy } from '../lib/ordering'
import type { Engagement, OrderingConfig } from '../lib/ordering'
import { onSale } from '../lib/pricing'
import { hasViewedProduct, piecesViewed } from '../lib/push'
import { coverMedia } from '../lib/media'
import ProductCard from '../components/ProductCard'
import type { Product } from '../types'

const AVAILABILITY_LABEL = { in_stock: 'In stock', sold_out: 'Sold out', on_order: 'On order' }

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-night-700/70 dark:text-cream-300/70"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// Highlights are orthogonal to garment type:
// 'all' | 'new' | 'sale' | 'saved' | 'enquired' | 'fresh' | 'c:<collection>'.
function matchesHighlight(
  p: Product,
  highlight: string,
  mine: { favs: Record<string, string>; enq: Record<string, string> },
): boolean {
  if (highlight === 'new') return isNew(p)
  if (highlight === 'sale') return onSale(p)
  if (highlight === 'saved') return p.id in mine.favs
  if (highlight === 'enquired') return p.id in mine.enq
  if (highlight === 'fresh') return !hasViewedProduct(p.id)
  if (highlight.startsWith('c:')) return p.collection === highlight.slice(2)
  return true
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(
    () => ({ ...filtersFromParams(searchParams), highlight: searchParams.get('hl') ?? 'all' }),
    [],
  )
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>(initial.category ?? 'All')
  const [highlight, setHighlight] = useState<string>(initial.highlight)
  const [filters, setFilters] = useState<CatalogFilters>(initial.filters)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [settingsCategories, setSettingsCategories] = useState<string[]>([])
  const [settingsSizes, setSettingsSizes] = useState<string[]>([])
  const [ordering, setOrdering] = useState<OrderingConfig>(defaultOrdering)
  const [engagement, setEngagement] = useState<Engagement>()
  const [mineVersion, setMineVersion] = useState(0)

  // Hearting a card updates localStorage; this keeps My Pieces in sync.
  useEffect(() => {
    const bump = () => setMineVersion((v) => v + 1)
    window.addEventListener('manjrees:favorites', bump)
    return () => window.removeEventListener('manjrees:favorites', bump)
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mine = useMemo(() => ({ favs: favoriteIds(), enq: enquiredIds() }), [mineVersion])

  useEffect(() => {
    listProducts()
      .then((list) => {
        setProducts(list)
        if (!searchParams.get('hl')) setHighlight(list.some(isNew) ? 'new' : 'all')
        // Ask the service worker to cache only cover photos (not gallery images).
        if ('serviceWorker' in navigator) {
          const covers = list
            .map((p) => coverMedia(p.images))
            .filter((url): url is string => url != null && url.startsWith('http'))
          navigator.serviceWorker.ready.then((reg) => {
            reg.active?.postMessage({ type: 'CACHE_COVERS', urls: covers })
          }).catch(() => {})
        }
      })
      .catch((e: Error) => setError(e.message))
    getSettings()
      .then((s) => {
        setSettingsCategories(s.categories)
        setSettingsSizes(s.sizes)
        setOrdering(s.ordering)
        // Only pay for the engagement query when a Trending order is configured.
        const usesTrending = [
          s.ordering.default,
          ...Object.values(s.ordering.byHighlight),
          ...Object.values(s.ordering.byCollection),
          ...Object.values(s.ordering.byCategory),
        ].includes('trending')
        if (usesTrending) fetchEngagement().then(setEngagement).catch(() => {})
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the URL shareable/refreshable (defaults are left out of it).
  useEffect(() => {
    if (!products) return
    const params = filtersToParams(filters, category === 'All' ? null : category)
    if (highlight !== 'all') params.set('hl', highlight)
    setSearchParams(params, { replace: true })
  }, [filters, category, highlight, products, setSearchParams])

  const collections = useMemo(
    () => [...new Set((products ?? []).map((p) => p.collection).filter((c): c is string => Boolean(c)))],
    [products],
  )
  const hasNew = useMemo(() => (products ?? []).some(isNew), [products])
  const hasSale = useMemo(() => (products ?? []).some(onSale), [products])
  const hasFresh = useMemo(
    () => piecesViewed() >= 3 && (products ?? []).some((p) => !hasViewedProduct(p.id)),
    [products],
  )

  const highlightOptions = useMemo(() => {
    const options: [string, string][] = [['all', 'Everything']]
    if (hasNew) options.push(['new', '✨ New Arrivals'])
    if (hasSale) options.push(['sale', '🏷️ On Sale'])
    for (const c of collections) options.push([`c:${c}`, `✦ ${c}`])
    if (hasFresh) options.push(['fresh', '✿ Fresh for you'])
    if (Object.keys(mine.favs).length) options.push(['saved', '♥ Saved by me'])
    if (Object.keys(mine.enq).length) options.push(['enquired', '✓ My Enquiries'])
    return options
  }, [hasNew, hasSale, collections, hasFresh, mine])

  // If the active highlight disappears (e.g. you unsave the last saved piece
  // while viewing Saved), fall back to Everything instead of an empty grid.
  useEffect(() => {
    if (products && !highlightOptions.some(([value]) => value === highlight)) {
      setHighlight('all')
    }
  }, [products, highlightOptions, highlight])

  const categoryOptions = useMemo(() => {
    const inUse = [...new Set((products ?? []).map((p) => p.category))]
    return ['All', ...settingsCategories, ...inUse.filter((c) => !settingsCategories.includes(c))]
  }, [products, settingsCategories])

  const filtered = useMemo(() => {
    const scoped = (products ?? []).filter(
      (p) => matchesHighlight(p, highlight, mine) && (category === 'All' || p.category === category),
    )
    // applyFilters sorts when the customer picked an explicit sort; for the
    // default "Recommended" (featured) it leaves order to us below.
    const result = applyFilters(scoped, filters)
    if (filters.sort !== 'featured') return result

    // Personal lists order by when the customer acted, most recent first.
    if (highlight === 'saved' || highlight === 'enquired') {
      const stamps = highlight === 'saved' ? mine.favs : mine.enq
      return [...result].sort((a, b) => ((stamps[b.id] ?? '') < (stamps[a.id] ?? '') ? -1 : 1))
    }
    // Otherwise apply the admin-resolved strategy (Model B precedence).
    const strategy = resolveStrategy(ordering, {
      collection: highlight.startsWith('c:') ? highlight.slice(2) : null,
      highlight: highlight === 'new' || highlight === 'sale' ? highlight : null,
      category: category === 'All' ? null : category,
    })
    return orderProducts(result, strategy, engagement)
  }, [products, highlight, category, filters, mine, ordering, engagement])

  const patchFilters = (patch: Partial<CatalogFilters>) => {
    // Record newly activated filters (never deactivations) for analytics.
    if (patch.sizes) {
      for (const s of patch.sizes.filter((s) => !filters.sizes.includes(s))) recordFilterUse('size', s)
    }
    if (patch.availability) recordFilterUse('availability', patch.availability)
    if (patch.sort && patch.sort !== 'featured') recordFilterUse('sort', patch.sort)
    setFilters((f) => ({ ...f, ...patch }))
  }

  const pickHighlight = (value: string) => {
    if (value === 'new') recordFilterUse('category', 'New Arrivals')
    else if (value === 'sale') recordFilterUse('category', 'On Sale')
    else if (value === 'fresh') recordFilterUse('category', 'Fresh for you')
    else if (value === 'saved') recordFilterUse('category', 'Saved by me')
    else if (value === 'enquired') recordFilterUse('category', 'My Enquiries')
    else if (value.startsWith('c:')) recordFilterUse('collection', value.slice(2))
    setHighlight(value)
  }

  const pickCategory = (value: string) => {
    if (value !== 'All') recordFilterUse('category', value)
    setCategory(value)
  }

  // Record search terms once the customer pauses typing.
  useEffect(() => {
    const q = filters.query.trim()
    if (q.length < 2) return
    const timer = setTimeout(() => recordFilterUse('search', q), 1200)
    return () => clearTimeout(timer)
  }, [filters.query])

  const activeCount = countActiveFilters(filters)
  const anyNarrowing =
    activeCount > 0 || filters.query.trim() !== '' || highlight !== 'all' || category !== 'All'

  if (error) {
    return <p className="p-8 text-center text-sm text-bougainvillea-500">Could not load the catalog: {error}</p>
  }
  if (!products) {
    return <p className="p-8 text-center text-sm text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  const selectClass =
    'w-full min-w-0 appearance-none rounded-full border border-cream-300 bg-cream-200 py-2 pl-4 pr-8 text-sm font-medium text-night-700 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-200'

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

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <span className="relative">
          <select
            value={highlight}
            onChange={(e) => pickHighlight(e.target.value)}
            aria-label="Highlights"
            className={`${selectClass} ${highlight !== 'all' ? '!border-marigold-500 !bg-marigold-400 !text-night-900' : ''}`}
          >
            {highlightOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Chevron />
        </span>
        <span className="relative">
          <select
            value={category}
            onChange={(e) => pickCategory(e.target.value)}
            aria-label="Garment type"
            className={`${selectClass} ${category !== 'All' ? '!border-marigold-500 !bg-marigold-400 !text-night-900' : ''}`}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All types' : c}
              </option>
            ))}
          </select>
          <Chevron />
        </span>
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
          {filters.sort !== 'featured' && (
            <button
              onClick={() => patchFilters({ sort: 'featured' })}
              className="shrink-0 rounded-full bg-night-800 px-3 py-1 text-xs font-medium text-cream-100 dark:bg-cream-200 dark:text-night-900"
            >
              {SORT_LABELS.find(([v]) => v === filters.sort)?.[1]} ✕
            </button>
          )}
        </div>
      )}

      <section>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-night-700/80 dark:text-cream-300/60">
              {anyNarrowing ? 'Nothing matches your search and filters.' : 'No pieces here yet — check back soon!'}
            </p>
            {anyNarrowing && (
              <button
                onClick={() => {
                  setFilters(emptyFilters)
                  setHighlight('all')
                  setCategory('All')
                }}
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
      />
    </main>
  )
}
