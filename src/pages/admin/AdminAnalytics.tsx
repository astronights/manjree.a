import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  computeFunnel,
  fetchEvents,
  summarize,
  summarizeByDay,
  summarizeFilters,
} from '../../lib/analytics'
import type { DayStat, FilterStat, Summary } from '../../lib/analytics'
import { listProducts } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import type { AnalyticsEvent, FilterKind, Product } from '../../types'

const FILTER_KIND_LABELS: [FilterKind, string][] = [
  ['search', 'Top searches'],
  ['size', 'Sizes wanted'],
  ['category', 'Categories browsed'],
  ['collection', 'Collections opened'],
  ['availability', 'Availability filters'],
  ['sort', 'Sort choices'],
]

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

// ── Daily Activity Chart ──────────────────────────────────────────────────────

const CHART_SERIES = [
  { key: 'views' as const, label: 'Views', lightHex: '#2a78d6', darkHex: '#3987e5' },
  { key: 'enquiries' as const, label: 'Enquiries', lightHex: '#e87ba4', darkHex: '#d55181' },
  { key: 'subscribers' as const, label: 'New opt-ins', lightHex: '#008300', darkHex: '#008300' },
]

interface DailyChartProps {
  stats: DayStat[]
  piecesPerDay: number[]
}

function DailyChart({ stats, piecesPerDay }: DailyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    idx: number
  } | null>(null)

  const PAD = { top: 16, right: 16, bottom: 40, left: 36 }
  const W = 700
  const H = 220
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const maxEvent = Math.max(
    1,
    ...stats.flatMap((d) => [d.views, d.enquiries, d.subscribers]),
  )
  const maxPieces = Math.max(1, ...piecesPerDay)

  const n = stats.length

  function xOf(i: number) {
    return PAD.left + (i / Math.max(n - 1, 1)) * plotW
  }
  function yOfEvent(v: number) {
    return PAD.top + plotH - (v / maxEvent) * plotH
  }
  function yOfPieces(v: number) {
    return PAD.top + plotH - (v / maxPieces) * plotH
  }

  function polyline(values: number[], yFn: (v: number) => number) {
    return values
      .map((v, i) => `${xOf(i).toFixed(1)},${yFn(v).toFixed(1)}`)
      .join(' ')
  }

  // X-axis tick labels: show ~6 evenly spaced dates
  const tickIdxs = [0, Math.floor(n / 5), Math.floor((2 * n) / 5), Math.floor((3 * n) / 5), Math.floor((4 * n) / 5), n - 1]
  const uniqueTicks = [...new Set(tickIdxs)]

  function fmtDate(iso: string) {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const plotX = svgX - PAD.left
    const idx = Math.round((plotX / plotW) * (n - 1))
    if (idx < 0 || idx >= n) {
      setTooltip(null)
      return
    }
    setTooltip({ x: xOf(idx), y: e.clientY - rect.top, idx })
  }

  const tip = tooltip !== null ? tooltip : null
  const tipData = tip !== null ? stats[tip.idx] : null
  const tipPieces = tip !== null ? piecesPerDay[tip.idx] : null

  // Determine tooltip horizontal position so it doesn't overflow
  const tipLeft = tip
    ? tip.x > W * 0.65
      ? 'auto'
      : `${tip.x + 12}px`
    : '0'
  const tipRight = tip
    ? tip.x > W * 0.65
      ? `${W - tip.x + 12}px`
      : 'auto'
    : 'auto'

  return (
    <div className="mnj-chart relative rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700">
      {/* CSS var definitions — both light and dark */}
      <style>{`
        .mnj-chart {
          --c-views-l: #2a78d6; --c-views-d: #3987e5;
          --c-enq-l:   #e87ba4; --c-enq-d:   #d55181;
          --c-sub-l:   #008300; --c-sub-d:   #008300;
          --c-pieces-l: #898781; --c-pieces-d: #898781;
          --c-grid-l:  #e1e0d9; --c-grid-d:  #2c2c2a;
          --c-axis-l:  #c3c2b7; --c-axis-d:  #383835;
          --c-text-l:  #52514e; --c-text-d:  #c3c2b7;

          --c-views:   var(--c-views-l);
          --c-enq:     var(--c-enq-l);
          --c-sub:     var(--c-sub-l);
          --c-pieces:  var(--c-pieces-l);
          --c-grid:    var(--c-grid-l);
          --c-axis:    var(--c-axis-l);
          --c-ink:     var(--c-text-l);
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .mnj-chart {
            --c-views:  var(--c-views-d);
            --c-enq:    var(--c-enq-d);
            --c-sub:    var(--c-sub-d);
            --c-pieces: var(--c-pieces-d);
            --c-grid:   var(--c-grid-d);
            --c-axis:   var(--c-axis-d);
            --c-ink:    var(--c-text-d);
          }
        }
        :root[data-theme="dark"] .mnj-chart {
          --c-views:  var(--c-views-d);
          --c-enq:    var(--c-enq-d);
          --c-sub:    var(--c-sub-d);
          --c-pieces: var(--c-pieces-d);
          --c-grid:   var(--c-grid-d);
          --c-axis:   var(--c-axis-d);
          --c-ink:    var(--c-text-d);
        }
      `}</style>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '480px', position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ display: 'block', overflow: 'visible' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
            aria-label="Daily activity line chart"
            role="img"
          >
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = PAD.top + t * plotH
              const v = Math.round(maxEvent * (1 - t))
              return (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    y1={y}
                    x2={PAD.left + plotW}
                    y2={y}
                    stroke="var(--c-grid)"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 6}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--c-ink)"
                    style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}
                  >
                    {v}
                  </text>
                </g>
              )
            })}

            {/* X axis baseline */}
            <line
              x1={PAD.left}
              y1={PAD.top + plotH}
              x2={PAD.left + plotW}
              y2={PAD.top + plotH}
              stroke="var(--c-axis)"
              strokeWidth="1"
            />

            {/* X tick labels */}
            {uniqueTicks.map((i) => (
              <text
                key={i}
                x={xOf(i)}
                y={PAD.top + plotH + 14}
                textAnchor="middle"
                fontSize="10"
                fill="var(--c-ink)"
                style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}
              >
                {fmtDate(stats[i].date)}
              </text>
            ))}

            {/* Pieces reference line (dashed, muted) */}
            {piecesPerDay.length === n && (
              <polyline
                points={polyline(piecesPerDay, yOfPieces)}
                fill="none"
                stroke="var(--c-pieces)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            )}

            {/* Event series lines */}
            {CHART_SERIES.map(({ key, label }) => (
              <polyline
                key={key}
                points={polyline(
                  stats.map((d) => d[key]),
                  yOfEvent,
                )}
                fill="none"
                stroke={`var(--c-${key === 'views' ? 'views' : key === 'enquiries' ? 'enq' : 'sub'})`}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                aria-label={label}
              />
            ))}

            {/* Crosshair + dots */}
            {tip !== null && (
              <>
                <line
                  x1={tip.x}
                  y1={PAD.top}
                  x2={tip.x}
                  y2={PAD.top + plotH}
                  stroke="var(--c-axis)"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
                {CHART_SERIES.map(({ key }) => (
                  <circle
                    key={key}
                    cx={tip.x}
                    cy={yOfEvent(stats[tip.idx][key])}
                    r="4"
                    fill={`var(--c-${key === 'views' ? 'views' : key === 'enquiries' ? 'enq' : 'sub'})`}
                    stroke="var(--c-grid)"
                    strokeWidth="1.5"
                  />
                ))}
                {piecesPerDay.length === n && (
                  <circle
                    cx={tip.x}
                    cy={yOfPieces(piecesPerDay[tip.idx])}
                    r="3.5"
                    fill="var(--c-pieces)"
                    stroke="var(--c-grid)"
                    strokeWidth="1.5"
                  />
                )}
              </>
            )}
          </svg>

          {/* Tooltip */}
          {tip !== null && tipData !== null && (
            <div
              style={{
                position: 'absolute',
                top: Math.max(0, (tip.y / H) * 100 - 5) + '%',
                left: tipLeft,
                right: tipRight,
                pointerEvents: 'none',
                zIndex: 10,
              }}
              className="w-44 rounded-xl bg-white/95 p-2.5 shadow-lg ring-1 ring-cream-300/60 dark:bg-night-900/95 dark:ring-night-700"
            >
              <p className="mb-1.5 text-xs font-medium text-night-800 dark:text-cream-100">
                {fmtDate(tipData.date)}
              </p>
              {CHART_SERIES.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-night-700/80 dark:text-cream-300/60">{label}</span>
                  <span className="text-xs tabular-nums text-night-800 dark:text-cream-100">
                    {tipData[key]}
                  </span>
                </div>
              ))}
              {tipPieces !== null && (
                <div className="flex items-center justify-between gap-2 border-t border-cream-200 pt-1 dark:border-night-700">
                  <span className="text-xs text-night-700/80 dark:text-cream-300/60">Pieces</span>
                  <span className="text-xs tabular-nums text-night-800 dark:text-cream-100">
                    {tipPieces}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend — required: magenta (enquiries) is sub-3:1 on light surface */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {CHART_SERIES.map(({ key, label, lightHex, darkHex }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-6 rounded-sm"
              style={
                {
                  background: lightHex,
                  '--dk': darkHex,
                } as React.CSSProperties
              }
            />
            <span className="text-xs text-night-700/80 dark:text-cream-300/60">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 rounded-sm bg-[#898781]" style={{ borderTop: '1.5px dashed #898781' }} />
          <span className="text-xs text-night-700/80 dark:text-cream-300/60">Pieces in catalog</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [data, setData] = useState<Summary | null>(null)
  const [filterStats, setFilterStats] = useState<Map<FilterKind, FilterStat[]>>(new Map())
  const [subscribers, setSubscribers] = useState<number | null>(null)
  const [rawEvents, setRawEvents] = useState<AnalyticsEvent[]>([])
  const [subDates, setSubDates] = useState<string[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchEvents(), listProducts({ includeDrafts: true })])
      .then(([events, products]) => {
        setRawEvents(events)
        setAllProducts(products)
        setData(summarize(events, products))
        setFilterStats(summarizeFilters(events))
      })
      .catch((e: Error) => setError(e.message))

    if (supabase) {
      supabase
        .from('push_subscriptions')
        .select('created_at')
        .then(({ data: rows, count }) => {
          setSubscribers(count ?? (rows?.length ?? 0))
          setSubDates((rows ?? []).map((r: { created_at: string }) => r.created_at))
        })
    }
  }, [])

  const dailyStats = useMemo(
    () => summarizeByDay(rawEvents, subDates, 30),
    [rawEvents, subDates],
  )

  const piecesByDay = useMemo(
    () =>
      dailyStats.map(
        (d) =>
          allProducts.filter(
            (p) => !p.is_draft && (p.created_at ?? '').slice(0, 10) <= d.date,
          ).length,
      ),
    [dailyStats, allProducts],
  )

  const hasChartData = dailyStats.some(
    (d) => d.views > 0 || d.enquiries > 0 || d.subscribers > 0,
  )

  if (error) {
    return <p className="p-8 text-center text-base text-bougainvillea-500">Could not load analytics: {error}</p>
  }
  if (!data) {
    return <p className="p-8 text-center text-base text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  const { totals, byProduct, byDevice } = data
  const maxViews = Math.max(1, ...byProduct.map((r) => r.views))
  const funnel = computeFunnel(byDevice)
  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
  const funnelRows: [string, number, string][] = [
    ['Visited the shop', funnel.devices, ''],
    ['Viewed a piece', funnel.viewers, `${pct(funnel.viewers, funnel.devices)}% of visitors`],
    ['Enquired on WhatsApp', funnel.enquirers, `${pct(funnel.enquirers, funnel.viewers)}% of viewers`],
  ]

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-base text-night-700/85 hover:underline dark:text-cream-300/70">
        ← Catalog
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">Analytics</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Piece views" value={totals.views} />
        <StatTile label="WhatsApp enquiries" value={totals.enquiries} />
        <StatTile label="Devices" value={totals.devices} />
        <StatTile label="Notification opt-ins" value={subscribers ?? 0} />
      </div>

      {hasChartData && (
        <section className="mt-7">
          <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
            Daily activity — last 30 days
          </h2>
          <p className="mb-3 text-sm text-night-700/80 dark:text-cream-300/60">
            Views, enquiries, and new notification opt-ins per day, alongside pieces in the catalog.
          </p>
          <DailyChart stats={dailyStats} piecesPerDay={piecesByDay} />
        </section>
      )}

      {byProduct.length === 0 && filterStats.size === 0 ? (
        <p className="py-16 text-center text-base text-night-700/80 dark:text-cream-300/60">
          No activity yet — numbers appear as customers browse the catalog.
        </p>
      ) : (
        <>
          {funnel.devices > 0 && (
            <section className="mt-7">
              <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
                Funnel
              </h2>
              <p className="text-sm text-night-700/80 dark:text-cream-300/60">
                How far customers get, by device.
              </p>
              <div className="mt-3 space-y-2 rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700">
                {funnelRows.map(([label, count, share]) => (
                  <div key={label}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base text-night-800 dark:text-cream-100">{label}</span>
                      <span className="shrink-0 text-sm tabular-nums text-night-700/85 dark:text-cream-300/70">
                        {count}
                        {share && <span className="ml-1.5 text-night-700/70 dark:text-cream-300/50">· {share}</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200 dark:bg-night-700">
                      <div
                        className="h-full rounded-full bg-marigold-600"
                        style={{ width: `${pct(count, funnel.devices)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {byProduct.length > 0 && (
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
                      {row.views > 0 && ` · ${Math.round((row.enquiries / row.views) * 100)}%`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          )}

          {filterStats.size > 0 && (
            <section className="mt-7">
              <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
                Popular filters
              </h2>
              <p className="text-sm text-night-700/80 dark:text-cream-300/60">
                What customers search and filter for — each counted once per visit.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FILTER_KIND_LABELS.filter(([kind]) => filterStats.get(kind)?.length).map(([kind, label]) => (
                  <div
                    key={kind}
                    className="rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700"
                  >
                    <h3 className="text-sm font-medium text-night-700/85 dark:text-cream-300/70">{label}</h3>
                    <ul className="mt-2 space-y-1.5">
                      {filterStats.get(kind)!.map((stat) => (
                        <li key={stat.value} className="flex items-center justify-between gap-3">
                          <span className="truncate text-base text-night-800 dark:text-cream-100">
                            {stat.value}
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-night-700/80 dark:text-cream-300/60">
                            {stat.count}×
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

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
