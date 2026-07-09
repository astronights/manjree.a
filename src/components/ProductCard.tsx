import { Link } from 'react-router-dom'
import { formatPrice } from '../config'
import { isNew } from '../lib/store'
import { enquiredAt } from '../lib/enquiries'
import { coverMedia, isVideo } from '../lib/media'
import type { Product } from '../types'

interface Props {
  product: Product
  size?: 'normal' | 'featured'
}

export default function ProductCard({ product, size = 'normal' }: Props) {
  const wide = size === 'featured'
  const cover = coverMedia(product.images)
  return (
    <Link
      to={`/product/${product.id}`}
      className={`group block overflow-hidden rounded-2xl bg-cream-50 shadow-sm ring-1 ring-cream-300/50 transition hover:shadow-md dark:bg-night-800 dark:ring-night-700 ${
        wide ? 'w-44 shrink-0 sm:w-52' : ''
      }`}
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
        {isNew(product) && (
          <span className="absolute left-2 top-2 rounded-full bg-marigold-400 px-2 py-0.5 text-[11px] font-semibold text-night-900 shadow">
            New
          </span>
        )}
        {enquiredAt(product.id) && (
          <span className="absolute right-2 top-2 rounded-full bg-leaf-500 px-2 py-0.5 text-[11px] font-medium text-white shadow">
            ✓ Enquired
          </span>
        )}
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
        <div className="mt-1 flex items-center justify-between">
          {product.show_price !== false ? (
            <span className="text-sm font-semibold text-bougainvillea-500 dark:text-bougainvillea-400">
              {formatPrice(product.price)}
            </span>
          ) : (
            <span className="text-xs text-night-700/80 dark:text-cream-300/60">Price on request</span>
          )}
          <span className="text-[11px] text-night-700/80 dark:text-cream-300/60">{product.category}</span>
        </div>
      </div>
    </Link>
  )
}
