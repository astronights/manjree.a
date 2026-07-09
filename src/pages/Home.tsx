import { useEffect, useMemo, useState } from 'react'
import { getSettings } from '../lib/settings'
import { listProducts, isNew } from '../lib/store'
import ProductCard from '../components/ProductCard'
import type { Product } from '../types'

// Sentinel tab that filters by "currently new" rather than by category.
const NEW_TAB = 'New Arrivals'

export default function Home() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [collection, setCollection] = useState<string | null>(null)
  const [settingsCategories, setSettingsCategories] = useState<string[]>([])

  useEffect(() => {
    listProducts()
      .then((list) => {
        setProducts(list)
        // Land on New Arrivals when there are any; otherwise on All.
        setCategory((prev) => prev ?? (list.some(isNew) ? NEW_TAB : 'All'))
      })
      .catch((e: Error) => setError(e.message))
    getSettings()
      .then((s) => setSettingsCategories(s.categories))
      .catch(() => {})
  }, [])

  const hasNew = useMemo(() => (products ?? []).some(isNew), [products])
  const collections = useMemo(
    () => [...new Set((products ?? []).map((p) => p.collection).filter((c): c is string => Boolean(c)))],
    [products],
  )
  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      const inTab =
        category === NEW_TAB ? isNew(p) : category === 'All' || !category || p.category === category
      return inTab && (collection === null || p.collection === collection)
    })
  }, [products, category, collection])
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

  if (error) {
    return <p className="p-8 text-center text-sm text-bougainvillea-500">Could not load the catalog: {error}</p>
  }
  if (!products) {
    return <p className="p-8 text-center text-sm text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <section className="pt-5">
        {collections.length > 0 && (
          <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {collections.map((c) => (
              <button
                key={c}
                onClick={() => setCollection(collection === c ? null : c)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  collection === c
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
          <p className="py-16 text-center text-sm text-night-700/80 dark:text-cream-300/60">
            No pieces in this category yet — check back soon!
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
