import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchEvents, summarize } from '../../lib/analytics'
import type { Summary } from '../../lib/analytics'
import { listProducts } from '../../lib/store'

function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700">
      <p className="font-display text-3xl font-semibold text-night-800 dark:text-cream-100">{value}</p>
      <p className="mt-1 text-sm text-night-700/85 dark:text-cream-300/70">{label}</p>
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchEvents(), listProducts({ includeDrafts: true })])
      .then(([events, products]) => setData(summarize(events, products)))
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) {
    return <p className="p-8 text-center text-base text-bougainvillea-500">Could not load analytics: {error}</p>
  }
  if (!data) {
    return <p className="p-8 text-center text-base text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  const { totals, byProduct, byDevice } = data
  const maxViews = Math.max(1, ...byProduct.map((r) => r.views))

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-base text-night-700/85 hover:underline dark:text-cream-300/70">
        ← Catalog
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">Analytics</h1>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatTile label="Piece views" value={totals.views} />
        <StatTile label="WhatsApp enquiries" value={totals.enquiries} />
        <StatTile label="Devices" value={totals.devices} />
      </div>

      {byProduct.length === 0 ? (
        <p className="py-16 text-center text-base text-night-700/80 dark:text-cream-300/60">
          No activity yet — numbers appear as customers browse the catalog.
        </p>
      ) : (
        <>
          <section className="mt-7">
            <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
              Most viewed pieces
            </h2>
            <p className="text-sm text-night-700/80 dark:text-cream-300/60">
              Views count once per device per visit; enquiries are WhatsApp taps.
            </p>
            <ul className="mt-3 space-y-2">
              {byProduct.map((row, i) => (
                <li
                  key={row.product?.id ?? `deleted-${i}`}
                  className="rounded-2xl bg-cream-50 p-3 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700"
                >
                  <div className="flex items-center gap-3">
                    {row.product ? (
                      <img src={row.product.images[0]} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-12 w-10 shrink-0 rounded-lg bg-cream-200 dark:bg-night-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-night-800 dark:text-cream-100">
                        {row.product ? (
                          <Link to={`/product/${row.product.id}`} className="hover:underline">
                            {row.product.title}
                          </Link>
                        ) : (
                          '(deleted piece)'
                        )}
                      </p>
                      {/* Single-series magnitude bar; hue #b0880d validated ≥3:1 on both surfaces */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200 dark:bg-night-700">
                          <div
                            className="h-full rounded-full bg-marigold-600"
                            style={{ width: `${(row.views / maxViews) * 100}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-sm tabular-nums text-night-700 dark:text-cream-200">
                          {row.views} view{row.views === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-cream-200 px-2.5 py-1 text-sm tabular-nums text-night-700 dark:bg-night-700 dark:text-cream-200">
                      {row.enquiries} ✆
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-7">
            <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
              Activity by device
            </h2>
            <p className="text-sm text-night-700/80 dark:text-cream-300/60">
              Customers don't log in — each browser gets an anonymous id, so one person can appear as
              two devices (e.g. phone and laptop).
            </p>
            <ul className="mt-3 space-y-2">
              {byDevice.map((d) => (
                <li
                  key={d.deviceId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-cream-50 p-3 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700"
                >
                  <span className="font-mono text-sm text-night-700 dark:text-cream-200">
                    {d.deviceId.slice(0, 8)}
                  </span>
                  <span className="text-sm tabular-nums text-night-700/85 dark:text-cream-300/70">
                    {d.views} views · {d.enquiries} enquiries · {relativeDay(d.lastActive)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
