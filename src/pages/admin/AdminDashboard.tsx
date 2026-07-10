import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatPrice } from '../../config'
import { deleteProduct, isNew, listProducts, saveProduct } from '../../lib/store'
import { matchesQuery } from '../../lib/filters'
import { coverMedia, isVideo } from '../../lib/media'
import type { Product } from '../../types'

type StatusFilter = 'all' | 'draft' | 'sold_out' | 'on_order'

const STATUS_CHIPS: [StatusFilter, string][] = [
  ['all', 'All'],
  ['draft', 'Drafts'],
  ['sold_out', 'Sold out'],
  ['on_order', 'On order'],
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const refresh = () => listProducts({ includeDrafts: true }).then(setProducts)
  useEffect(() => {
    refresh()
  }, [])

  const remove = async (product: Product) => {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return
    await deleteProduct(product.id)
    refresh()
  }

  const duplicate = async (product: Product) => {
    const copy = {
      ...product,
      id: undefined,
      created_at: undefined,
      title: `${product.title} (copy)`,
      is_draft: true,
      pinned: false,
    }
    const saved = await saveProduct(copy)
    navigate(`/admin/edit/${saved.id}`)
  }

  if (!products) {
    return <p className="p-8 text-center text-base text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  const visible = products.filter(
    (p) =>
      matchesQuery(p, query) &&
      (status === 'all' || (status === 'draft' ? p.is_draft : p.stock_status === status)),
  )

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <div className="pt-5">
        <h1 className="font-display text-2xl font-semibold text-night-800 dark:text-cream-100">Catalog</h1>
        <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
          {products.length} total · {products.filter((p) => p.is_draft).length} drafts ·{' '}
          {products.filter((p) => p.stock_status === 'sold_out').length} sold out ·{' '}
          {products.filter((p) => p.stock_status === 'on_order').length} on order
        </p>
      </div>

      <Link
        to="/admin/new"
        className="mt-4 block rounded-xl bg-marigold-400 py-3 text-center font-semibold text-night-900 shadow-sm transition hover:bg-marigold-300"
      >
        + Add new piece
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          to="/admin/analytics"
          className="rounded-xl border border-cream-300 bg-cream-50 py-2.5 text-center text-base font-medium text-night-800 transition hover:bg-cream-200 dark:border-night-700 dark:bg-night-800 dark:text-cream-100 dark:hover:bg-night-700"
        >
          📊 Analytics
        </Link>
        <Link
          to="/admin/settings"
          className="rounded-xl border border-cream-300 bg-cream-50 py-2.5 text-center text-base font-medium text-night-800 transition hover:bg-cream-200 dark:border-night-700 dark:bg-night-800 dark:text-cream-100 dark:hover:bg-night-700"
        >
          ⚙️ Settings
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your pieces…"
        className="mt-4 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
      />
      <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
        {STATUS_CHIPS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              status === value
                ? 'bg-night-800 text-cream-100 dark:bg-marigold-400 dark:text-night-900'
                : 'bg-cream-200 text-night-700 hover:bg-cream-300 dark:bg-night-800 dark:text-cream-200 dark:hover:bg-night-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="py-12 text-center text-base text-night-700/80 dark:text-cream-300/60">
          No pieces match — try a different search or status.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {visible.map((p) => (
          <li
            key={p.id}
            className="flex gap-3 rounded-2xl bg-cream-50 p-3 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700"
          >
            {(() => {
              const cover = coverMedia(p.images)
              return cover && isVideo(cover) ? (
                <video src={cover} muted playsInline preload="metadata" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <img src={cover} alt="" className="h-20 w-16 shrink-0 rounded-lg bg-cream-200 object-cover dark:bg-night-700" />
              )
            })()}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate font-display font-semibold text-night-800 dark:text-cream-100">
                  {p.title}
                </span>
                {p.is_draft && (
                  <span className="rounded-full bg-cream-300 px-2 py-0.5 text-xs font-medium text-night-700 dark:bg-night-700 dark:text-cream-200">
                    Draft
                  </span>
                )}
                {isNew(p) && (
                  <span className="rounded-full bg-marigold-400 px-2 py-0.5 text-xs font-semibold text-night-900">
                    New
                  </span>
                )}
                {p.stock_status === 'sold_out' && (
                  <span className="rounded-full bg-bougainvillea-500 px-2 py-0.5 text-xs font-medium text-white">
                    Sold out
                  </span>
                )}
                {p.stock_status === 'on_order' && (
                  <span className="rounded-full bg-marigold-100 px-2 py-0.5 text-xs font-medium text-marigold-700 dark:bg-night-700 dark:text-marigold-300">
                    On order
                  </span>
                )}
                {p.pinned && (
                  <span className="rounded-full bg-leaf-500 px-2 py-0.5 text-xs font-medium text-white">
                    Pinned
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-base text-night-700/85 dark:text-cream-300/70">
                {formatPrice(p.price)} · {p.category}
              </p>
              <div className="mt-1.5 flex gap-3 text-base">
                <Link to={`/admin/edit/${p.id}`} className="font-medium text-leaf-500 hover:underline">
                  Edit
                </Link>
                <button onClick={() => duplicate(p)} className="text-night-700/85 hover:underline dark:text-cream-300/70">
                  Duplicate
                </button>
                <button onClick={() => remove(p)} className="text-bougainvillea-500 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
