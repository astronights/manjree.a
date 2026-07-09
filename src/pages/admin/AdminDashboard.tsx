import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatPrice } from '../../config'
import { deleteProduct, isNew, listProducts, saveProduct, signOut } from '../../lib/store'
import { coverMedia, isVideo } from '../../lib/media'
import type { Product } from '../../types'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[] | null>(null)

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

  const logout = async () => {
    await signOut()
    navigate('/')
  }

  if (!products) {
    return <p className="p-8 text-center text-sm text-night-700/60 dark:text-cream-300/60">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <div className="flex items-center justify-between pt-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-night-800 dark:text-cream-100">Catalog</h1>
          <p className="text-xs text-night-700/60 dark:text-cream-300/60">
            {products.length} total · {products.filter((p) => p.is_draft).length} drafts ·{' '}
            {products.filter((p) => !p.in_stock).length} sold out
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/admin/analytics" className="text-sm font-medium text-leaf-500 hover:underline">
            Analytics
          </Link>
          <button onClick={logout} className="text-sm text-night-700/70 underline dark:text-cream-300/70">
            Lock
          </button>
        </div>
      </div>

      <Link
        to="/admin/new"
        className="mt-4 block rounded-xl bg-marigold-400 py-3 text-center font-semibold text-night-900 shadow-sm transition hover:bg-marigold-300"
      >
        + Add new piece
      </Link>

      <ul className="mt-5 space-y-3">
        {products.map((p) => (
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
                  <span className="rounded-full bg-cream-300 px-2 py-0.5 text-[10px] font-medium text-night-700 dark:bg-night-700 dark:text-cream-200">
                    Draft
                  </span>
                )}
                {isNew(p) && (
                  <span className="rounded-full bg-marigold-400 px-2 py-0.5 text-[10px] font-semibold text-night-900">
                    New
                  </span>
                )}
                {!p.in_stock && (
                  <span className="rounded-full bg-bougainvillea-500 px-2 py-0.5 text-[10px] font-medium text-white">
                    Sold out
                  </span>
                )}
                {p.pinned && (
                  <span className="rounded-full bg-leaf-500 px-2 py-0.5 text-[10px] font-medium text-white">
                    Pinned
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-night-700/70 dark:text-cream-300/70">
                {formatPrice(p.price)} · {p.category}
              </p>
              <div className="mt-1.5 flex gap-3 text-sm">
                <Link to={`/admin/edit/${p.id}`} className="font-medium text-leaf-500 hover:underline">
                  Edit
                </Link>
                <button onClick={() => duplicate(p)} className="text-night-700/70 hover:underline dark:text-cream-300/70">
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
