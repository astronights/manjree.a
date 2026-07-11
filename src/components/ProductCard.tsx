import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../config'
import { isNew } from '../lib/store'
import { enquiredAt } from '../lib/enquiries'
import { isFavorite, toggleFavorite } from '../lib/favorites'
import { coverMedia, isVideo } from '../lib/media'
import { onSale } from '../lib/pricing'
import type { Product } from '../types'

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? '#C2185B' : 'none'}
      stroke={filled ? '#C2185B' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
    </svg>
  )
}

export default function ProductCard({ product }: { product: Product }) {
  const cover = coverMedia(product.images)
  const fresh = isNew(product)
  const [saved, setSaved] = useState(() => isFavorite(product.id))
  return (
    <Link
      to={`/product/${product.id}`}
      className="group block overflow-hidden rounded-2xl bg-cream-50 shadow-sm ring-1 ring-cream-300/50 transition hover:shadow-md dark:bg-night-800 dark:ring-night-700"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-200 dark:bg-night-700">
        {cover && isVideo(cover) ? (
          <video
            src={cover}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={cover}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        )}
        {fresh && (
          <span className="absolute left-2 top-2 rounded-full bg-marigold-400 px-2 py-0.5 text-[11px] font-semibold text-night-900 shadow">
            New
          </span>
        )}
        {enquiredAt(product.id) && (
          <span
            className={`absolute left-2 rounded-full bg-leaf-500 px-2 py-0.5 text-[11px] font-medium text-white shadow ${
              fresh ? 'top-9' : 'top-2'
            }`}
          >
            ✓ Enquired
          </span>
        )}
        <button
          aria-label={saved ? 'Remove from my pieces' : 'Save to my pieces'}
          onClick={(e) => {
            e.preventDefault()
            setSaved(toggleFavorite(product.id))
          }}
          className="absolute right-2 top-2 rounded-full bg-cream-50/90 p-1.5 text-night-700 shadow dark:bg-night-900/80 dark:text-cream-200"
        >
          <HeartIcon filled={saved} />
        </button>
        {product.stock_status === 'sold_out' && (
          <span className="absolute inset-x-0 bottom-0 bg-night-900/70 py-1 text-center text-xs font-medium text-cream-100">
            Sold out
          </span>
        )}
        {product.stock_status === 'on_order' && (
          <span className="absolute inset-x-0 bottom-0 bg-leaf-500/90 py-1 text-center text-xs font-medium text-white">
            Available on order
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-display text-sm font-semibold text-night-800 dark:text-cream-100">
          {product.title}
        </h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="shrink-0">
            {product.show_price !== false ? (
              onSale(product) ? (
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-bougainvillea-500 dark:text-bougainvillea-400">
                    {formatPrice(product.sale_price!)}
                  </span>
                  <span className="text-xs text-night-700/70 line-through dark:text-cream-300/50">
                    {formatPrice(product.price)}
                  </span>
                </span>
              ) : (
                <span className="text-sm font-semibold text-bougainvillea-500 dark:text-bougainvillea-400">
                  {formatPrice(product.price)}
                </span>
              )
            ) : (
              <span className="text-xs text-night-700/80 dark:text-cream-300/60">Price on request</span>
            )}
          </span>
          <span className="min-w-0 truncate text-right text-[11px] text-night-700/80 dark:text-cream-300/60">
            {product.category}
          </span>
        </div>
      </div>
    </Link>
  )
}
