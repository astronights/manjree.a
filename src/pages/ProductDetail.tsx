import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice, whatsappLabel, whatsappLink, shop } from '../config'
import { getProduct, isNew } from '../lib/store'
import { recordEvent, recordViewOnce } from '../lib/analytics'
import { notePieceViewed } from '../lib/push'
import { enquiredAt, markEnquired } from '../lib/enquiries'
import { isFavorite, toggleFavorite } from '../lib/favorites'
import { HeartIcon } from '../components/ProductCard'
import { isVideo } from '../lib/media'
import { onSale, salePercent } from '../lib/pricing'
import type { Product } from '../types'

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a13 13 0 0 1-1.5-.5 11.5 11.5 0 0 1-4.4-3.9c-.5-.7-1-1.6-1-2.5 0-.9.4-1.4.6-1.6.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.1 1.5 1.8 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.7-.8c.2-.3.4-.2.6-.1l1.7.8c.3.1.4.2.5.3 0 .2 0 .5-.2.9z" />
    </svg>
  )
}

export default function ProductDetail() {
  const { id = '' } = useParams()
  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [imageIndex, setImageIndex] = useState(0)
  const [size, setSize] = useState('')
  const [enquired, setEnquired] = useState<string | null>(() => enquiredAt(id))
  const [saved, setSaved] = useState(() => isFavorite(id))
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    setEnquired(enquiredAt(id))
    getProduct(id).then(setProduct).catch(() => setProduct(null))
  }, [id])

  useEffect(() => {
    if (product && !product.is_draft) {
      recordViewOnce(product.id)
      notePieceViewed(product.id)
      document.title = `${product.title} — Manjree's`

      const stockMap: Record<string, string> = {
        in_stock: 'https://schema.org/InStock',
        sold_out: 'https://schema.org/OutOfStock',
        on_order: 'https://schema.org/PreOrder',
      }
      const ld: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        image: product.images.filter((u) => /^https?:\/\//.test(u)),
        ...(product.description ? { description: product.description.slice(0, 500) } : {}),
        brand: { '@type': 'Brand', name: "Manjree's" },
        category: product.category,
        size: product.sizes,
        offers: {
          '@type': 'Offer',
          url: `https://manjree.online/product/${product.id}`,
          availability: stockMap[product.stock_status] ?? 'https://schema.org/InStock',
          ...(product.show_price
            ? { priceCurrency: 'INR', price: String(product.sale_price ?? product.price) }
            : {}),
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
            shippingRate: { '@type': 'MonetaryAmount', currency: 'INR' },
          },
        },
      }
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = 'product-jsonld'
      script.textContent = JSON.stringify(ld)
      document.head.appendChild(script)
    }
    return () => {
      document.title = "Manjree's — Ethnic Wear"
      document.getElementById('product-jsonld')?.remove()
    }
  }, [product])

  if (product === undefined) {
    return <p className="p-8 text-center text-sm text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }
  if (product === null || product.is_draft) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-night-700/85 dark:text-cream-300/70">This piece could not be found.</p>
        <Link to="/" className="mt-2 inline-block text-sm font-medium text-bougainvillea-500 underline">
          Back to the catalog
        </Link>
      </div>
    )
  }

  const share = async () => {
    const data = { title: `${product.title} — ${shop.name}`, url: window.location.href }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(data.url)
      alert('Link copied!')
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28">
      <Link to="/" className="mt-3 inline-block text-sm text-night-700/85 hover:underline dark:text-cream-300/70">
        ← All pieces
      </Link>

      <div className="relative mt-3 overflow-hidden rounded-2xl bg-cream-200 dark:bg-night-800">
        <div
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget
            setImageIndex(Math.round(el.scrollLeft / el.clientWidth))
          }}
        >
          {product.images.map((src, i) =>
            isVideo(src) ? (
              <video
                key={i}
                src={src}
                controls
                playsInline
                preload="metadata"
                className="aspect-[4/5] w-full shrink-0 snap-center bg-night-900 object-contain"
              />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => setPreview(src)}
                aria-label={`View photo ${i + 1} full screen`}
                className="aspect-[4/5] w-full shrink-0 snap-center"
              >
                <img
                  src={src}
                  alt={`${product.title} — photo ${i + 1}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  className="h-full w-full object-cover"
                />
              </button>
            ),
          )}
        </div>
        {isNew(product) && (
          <span className="absolute left-3 top-3 rounded-full bg-marigold-400 px-2.5 py-1 text-xs font-semibold text-night-900 shadow">
            New
          </span>
        )}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {product.images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === imageIndex ? 'bg-marigold-400' : 'bg-cream-100/70'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
            {product.title}
          </h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-night-700/80 dark:text-cream-300/60">
            {product.category}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
        <button
          onClick={() => setSaved(toggleFavorite(product.id))}
          aria-label={saved ? 'Remove from my pieces' : 'Save to my pieces'}
          className="rounded-full p-2 text-night-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-night-800"
        >
          <HeartIcon filled={saved} />
        </button>
        <button
          onClick={share}
          aria-label="Share"
          className="rounded-full p-2 text-night-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-night-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
          </svg>
        </button>
        </div>
      </div>

      {product.show_price !== false ? (
        onSale(product) ? (
          <p className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold text-bougainvillea-500 dark:text-bougainvillea-400">
              {formatPrice(product.sale_price!)}
            </span>
            <span className="text-base text-night-700/70 line-through dark:text-cream-300/60">
              {formatPrice(product.price)}
            </span>
            <span className="rounded-full bg-bougainvillea-500 px-2 py-0.5 text-xs font-semibold text-white">
              {salePercent(product)}% off
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xl font-semibold text-bougainvillea-500 dark:text-bougainvillea-400">
            {formatPrice(product.price)}
          </p>
        )
      ) : (
        <p className="mt-2 text-sm font-medium text-night-700/85 dark:text-cream-300/70">
          Price on request — ask on WhatsApp
        </p>
      )}

      {product.collection && (
        <p className="mt-1.5 inline-block rounded-full bg-marigold-100 px-2.5 py-0.5 text-xs font-medium text-marigold-700 dark:bg-night-800 dark:text-marigold-300">
          {product.collection}
        </p>
      )}

      {enquired && (
        <p className="mt-2 text-xs font-medium text-leaf-500">
          ✓ You enquired about this on {new Date(enquired).toLocaleDateString()} (on this device)
        </p>
      )}

      {product.stock_status === 'sold_out' && (
        <p className="mt-2 inline-block rounded-full bg-night-800 px-3 py-1 text-xs font-medium text-cream-100 dark:bg-cream-200 dark:text-night-900">
          Currently sold out — enquire to be notified on restock
        </p>
      )}

      {product.stock_status === 'on_order' && (
        <p className="mt-2 inline-block rounded-full bg-leaf-500 px-3 py-1 text-xs font-medium text-white">
          Made on order — ask on WhatsApp for timelines
        </p>
      )}

      {product.sizes.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-medium text-night-800 dark:text-cream-100">Available sizes</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(size === s ? '' : s)}
                className={`min-w-11 rounded-lg border px-3 py-1.5 text-sm transition ${
                  size === s
                    ? 'border-marigold-500 bg-marigold-400 font-semibold text-night-900'
                    : 'border-cream-300 bg-cream-50 text-night-700 dark:border-night-700 dark:bg-night-800 dark:text-cream-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-night-700 dark:text-cream-200">
        {product.description}
      </p>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-300/60 bg-cream-100/95 p-3 backdrop-blur dark:border-night-700 dark:bg-night-900/95">
        <a
          href={whatsappLink(product, size)}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            recordEvent('enquiry', product.id).catch(() => {})
            markEnquired(product.id)
            setEnquired(new Date().toISOString())
          }}
          className="mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 font-semibold text-white shadow-md transition hover:brightness-95"
        >
          <WhatsAppIcon />
          {whatsappLabel(product.stock_status)}
        </a>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night-900/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setPreview(null)}
        >
          {isVideo(preview) ? (
            <video
              src={preview}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img src={preview} alt={product.title} className="max-h-full max-w-full rounded-xl object-contain" />
          )}
          <button
            onClick={() => setPreview(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 rounded-full bg-cream-50/90 px-3 py-1.5 text-lg text-night-800"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  )
}
