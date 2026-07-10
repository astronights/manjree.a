import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts } from '../lib/store'
import { favoriteIds } from '../lib/favorites'
import { enquiredIds } from '../lib/enquiries'
import ProductCard from '../components/ProductCard'
import type { Product } from '../types'

// Everything here is device-local (browser storage) — no account needed.
export default function MyPieces() {
  const [products, setProducts] = useState<Product[] | null>(null)

  useEffect(() => {
    listProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  const { saved, enquiredOnly } = useMemo(() => {
    const favs = favoriteIds()
    const enq = enquiredIds()
    const byTime = (map: Record<string, string>) => (a: Product, b: Product) =>
      (map[b.id] ?? '') < (map[a.id] ?? '') ? -1 : 1
    const savedPieces = (products ?? [])
      .filter((p) => p.id in favs)
      .sort(byTime(favs))
      // Saved-but-not-yet-enquired first: those are the open wishes.
      .sort((a, b) => Number(a.id in enq) - Number(b.id in enq))
    const enquiredPieces = (products ?? [])
      .filter((p) => p.id in enq && !(p.id in favs))
      .sort(byTime(enq))
    return { saved: savedPieces, enquiredOnly: enquiredPieces }
  }, [products])

  if (!products) {
    return <p className="p-8 text-center text-sm text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <h1 className="pt-5 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        My pieces
      </h1>
      <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
        Saved on this device — tap the ♥ on any piece to keep it here.
      </p>

      {saved.length === 0 && enquiredOnly.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-night-700/80 dark:text-cream-300/60">
            Nothing saved yet. Browse the catalog and tap the heart on pieces you love.
          </p>
          <Link
            to="/"
            className="mt-3 inline-block rounded-full bg-marigold-400 px-4 py-1.5 text-sm font-semibold text-night-900 transition hover:bg-marigold-300"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <>
          {saved.length > 0 && (
            <section className="mt-5">
              <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
                Saved by you
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {saved.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
          {enquiredOnly.length > 0 && (
            <section className="mt-7">
              <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
                You enquired about
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {enquiredOnly.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
