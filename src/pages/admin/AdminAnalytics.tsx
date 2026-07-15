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

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nDaysAgoStr(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - (n - 1))
  return d.toISOString().slice(0, 10)
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
  { key: 'views' as const, label: 'Views', cssVar: 'views' },
  { key: 'enquiries' as const, label: 'Enquiries', cssVar: 'enq' },
  { key: 'subscribers' as const, label: 'Total opt-ins', cssVar: 'sub' },
]

interface DailyChartProps {
  stats: DayStat[]
  piecesPerDay: number[]
}

function DailyChart({ stats, piecesPerDay }: DailyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null)

  const PAD = { top: 20, right: 16, bottom: 44, left: 40 }
  const W = 700
  const H = 240
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const n = stats.length

  const maxEvent = Math.max(1, ...stats.flatMap((d) => [d.views, d.enquiries, d.subscribers]))
  const maxPieces = Math.max(1, ...piecesPerDay)

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
    return values.map((v, i) => `${xOf(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' ')
  }

  // ~6 evenly spaced x-axis labels
  const tickCount = Math.min(n, 6)
  const tickIdxs = Array.from({ length: tickCount }, (_, k) =>
    Math.round((k / (tickCount - 1)) * (n - 1)),
  )
  const uniqueTicks = [...new Set(tickIdxs)]

  // Y-axis: 5 gridlines at 0%, 25%, 50%, 75%, 100%
  const yGridLines = [0, 0.25, 0.5, 0.75, 1]

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
    if (idx < 0 || idx >= n) { setTooltip(null); return }
    setTooltip({ x: xOf(idx), y: (e.clientY - rect.top) / rect.height, idx })
  }

  const tip = tooltip ?? null
  const tipData = tip !== null ? stats[tip.idx] : null
  const tipPieces = tip !== null ? piecesPerDay[tip.idx] : null

  const tipLeft = tip ? (tip.x / W > 0.6 ? 'auto' : `${(tip.x / W) * 100 + 2}%`) : '0'
  const tipRight = tip ? (tip.x / W > 0.6 ? `${(1 - tip.x / W) * 100 + 2}%` : 'auto') : 'auto'

  return (
    <div className="mnj-chart rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700">
      <style>{`
        .mnj-chart {
          --c-views:   #2a78d6; --c-enq: #e87ba4; --c-sub: #008300;
          --c-pieces:  #52514e;
          --c-grid:    #e1e0d9; --c-axis: #c3c2b7;
          --c-tick:    #0b0b0b;
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .mnj-chart {
            --c-views:  #3987e5; --c-enq: #d55181; --c-sub: #008300;
            --c-pieces: #c3c2b7;
            --c-grid:   #2c2c2a; --c-axis: #383835;
            --c-tick:   #ffffff;
          }
        }
        :root[data-theme="dark"] .mnj-chart {
          --c-views:  #3987e5; --c-enq: #d55181; --c-sub: #008300;
          --c-pieces: #c3c2b7;
          --c-grid:   #2c2c2a; --c-axis: #383835;
          --c-tick:   #ffffff;
        }
      `}</style>

      <div className="relative overflow-x-auto">
        <div style={{ minWidth: '420px', position: 'relative' }}>
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
            {/* Gridlines + Y labels */}
            {yGridLines.map((t) => {
              const y = PAD.top + t * plotH
              const v = Math.round(maxEvent * (1 - t))
              return (
                <g key={t}>
                  <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y}
                    stroke="var(--c-grid)" strokeWidth="1" />
                  <text x={PAD.left - 8} y={y + 4.5} textAnchor="end"
                    fontSize="12" fontWeight="500" fill="var(--c-tick)"
                    style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}>
                    {v}
                  </text>
                </g>
              )
            })}

            {/* X baseline */}
            <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH}
              stroke="var(--c-axis)" strokeWidth="1" />

            {/* X tick marks + labels */}
            {uniqueTicks.map((i) => (
              <g key={i}>
                <line x1={xOf(i)} y1={PAD.top + plotH} x2={xOf(i)} y2={PAD.top + plotH + 4}
                  stroke="var(--c-axis)" strokeWidth="1" />
                <text x={xOf(i)} y={PAD.top + plotH + 18} textAnchor="middle"
                  fontSize="12" fontWeight="500" fill="var(--c-tick)"
                  style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}>
                  {fmtDate(stats[i].date)}
                </text>
              </g>
            ))}

            {/* Pieces reference line (dashed muted) */}
            {piecesPerDay.length === n && (
              <polyline points={polyline(piecesPerDay, yOfPieces)}
                fill="none" stroke="var(--c-pieces)" strokeWidth="1.5" strokeDasharray="4 3" />
            )}

            {/* Event series lines */}
            {CHART_SERIES.map(({ key, cssVar }) => (
              <polyline key={key}
                points={polyline(stats.map((d) => d[key]), yOfEvent)}
                fill="none" stroke={`var(--c-${cssVar})`}
                strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}

            {/* Crosshair + dots */}
            {tip !== null && (
              <>
                <line x1={tip.x} y1={PAD.top} x2={tip.x} y2={PAD.top + plotH}
                  stroke="var(--c-axis)" strokeWidth="1" strokeDasharray="3 2" />
                {CHART_SERIES.map(({ key, cssVar }) => (
                  <circle key={key}
                    cx={tip.x} cy={yOfEvent(stats[tip.idx][key])} r="4.5"
                    fill={`var(--c-${cssVar})`} stroke="var(--c-grid)" strokeWidth="2" />
                ))}
                {piecesPerDay.length === n && (
                  <circle cx={tip.x} cy={yOfPieces(piecesPerDay[tip.idx])} r="4"
                    fill="var(--c-pieces)" stroke="var(--c-grid)" strokeWidth="2" />
                )}
              </>
            )}
          </svg>

          {/* Floating tooltip */}
          {tip !== null && tipData !== null && (
            <div
              style={{ position: 'absolute', top: `${tip.y * 100}%`, left: tipLeft, right: tipRight, pointerEvents: 'none', zIndex: 10 }}
              className="w-44 -translate-y-1/2 rounded-xl bg-white/95 p-2.5 shadow-lg ring-1 ring-cream-300/60 dark:bg-night-900/95 dark:ring-night-700"
            >
              <p className="mb-1.5 text-xs font-semibold text-night-800 dark:text-cream-100">
                {fmtDate(tipData.date)}
              </p>
              {CHART_SERIES.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-night-700/80 dark:text-cream-300/60">{label}</span>
                  <span className="text-xs tabular-nums font-medium text-night-800 dark:text-cream-100">
                    {tipData[key]}
                  </span>
                </div>
              ))}
              {tipPieces !== null && (
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-cream-200 pt-1 dark:border-night-700">
                  <span className="text-xs text-night-700/80 dark:text-cream-300/60">Pieces</span>
                  <span className="text-xs tabular-nums font-medium text-night-800 dark:text-cream-100">
                    {tipPieces}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend — required: magenta (enquiries) is sub-3:1 on light surface */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: 'var(--c-views)' }} />
          <span className="text-xs text-night-700/80 dark:text-cream-300/60">Views</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: 'var(--c-enq)' }} />
          <span className="text-xs text-night-700/80 dark:text-cream-300/60">Enquiries</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: 'var(--c-sub)' }} />
          <span className="text-xs text-night-700/80 dark:text-cream-300/60">Total opt-ins</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed" style={{ borderColor: 'var(--c-pieces)' }} />
          <span className="text-xs text-night-700/80 dark:text-cream-300/60">Pieces in catalog</span>
        </div>
      </div>
    </div>
  )
}

// ── Chart controls ────────────────────────────────────────────────────────────

type Preset = '7d' | '14d' | '30d' | 'custom'

interface ChartControlsProps {
  preset: Preset
  setPreset: (p: Preset) => void
  customStart: string
  customEnd: string
  setCustomStart: (s: string) => void
  setCustomEnd: (s: string) => void
  categories: string[]
  categoryFilter: string
  setCategoryFilter: (c: string) => void
}

function ChartControls({
  preset, setPreset, customStart, customEnd, setCustomStart, setCustomEnd,
  categories, categoryFilter, setCategoryFilter,
}: ChartControlsProps) {
  const pill =
    'rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400'
  const active = `${pill} bg-night-800 text-cream-50 dark:bg-cream-100 dark:text-night-900`
  const inactive = `${pill} text-night-700 hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-night-700`

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      {/* Period presets */}
      <div className="flex items-center gap-0.5 rounded-full bg-cream-100 p-0.5 dark:bg-night-700">
        {(['7d', '14d', '30d'] as Preset[]).map((p) => (
          <button key={p} onClick={() => setPreset(p)} className={preset === p ? active : inactive}>
            {p === '7d' ? '7 days' : p === '14d' ? '14 days' : '30 days'}
          </button>
        ))}
        <button onClick={() => setPreset('custom')} className={preset === 'custom' ? active : inactive}>
          Custom
        </button>
      </div>

      {/* Piece type filter */}
      {categories.length > 1 && (
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-cream-300 bg-cream-50 px-3 py-1 text-xs font-medium text-night-800 focus:outline-none focus:ring-2 focus:ring-marigold-400 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
        >
          <option value="all">All types</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-cream-300 bg-cream-50 px-2.5 py-1 text-xs text-night-800 focus:outline-none focus:ring-2 focus:ring-marigold-400 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
          />
          <span className="text-xs text-night-700/60 dark:text-cream-300/50">to</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={todayStr()}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-cream-300 bg-cream-50 px-2.5 py-1 text-xs text-night-800 focus:outline-none focus:ring-2 focus:ring-marigold-400 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
          />
        </div>
      )}
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

  // Chart controls
  const [preset, setPreset] = useState<Preset>('7d')
  const [customStart, setCustomStart] = useState(nDaysAgoStr(7))
  const [customEnd, setCustomEnd] = useState(todayStr())
  const [categoryFilter, setCategoryFilter] = useState('all')

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
        .then(({ data: rows }) => {
          setSubscribers(rows?.length ?? 0)
          setSubDates((rows ?? []).map((r: { created_at: string }) => r.created_at))
        })
    }
  }, [])

  const categories = useMemo(
    () => [...new Set(allProducts.map((p) => p.category))].sort(),
    [allProducts],
  )

  const { startDate, endDate } = useMemo(() => {
    if (preset === 'custom') return { startDate: customStart, endDate: customEnd }
    const days = preset === '7d' ? 7 : preset === '14d' ? 14 : 30
    return { startDate: nDaysAgoStr(days), endDate: todayStr() }
  }, [preset, customStart, customEnd])

  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'all') return rawEvents
    const ids = new Set(allProducts.filter((p) => p.category === categoryFilter).map((p) => p.id))
    return rawEvents.filter((e) => e.product_id !== null && ids.has(e.product_id))
  }, [rawEvents, allProducts, categoryFilter])

  const dailyStats = useMemo(
    () => (startDate <= endDate ? summarizeByDay(filteredEvents, subDates, startDate, endDate) : []),
    [filteredEvents, subDates, startDate, endDate],
  )

  // Running total of all subscribers as of each chart day (not just new in range).
  const chartStats = useMemo(() => {
    const sorted = [...subDates].filter((d) => typeof d === 'string').sort()
    return dailyStats.map((d) => {
      let total = 0
      for (const dt of sorted) {
        if (dt.slice(0, 10) <= d.date) total++
        else break
      }
      return { ...d, subscribers: total }
    })
  }, [dailyStats, subDates])

  const piecesByDay = useMemo(() => {
    const productList =
      categoryFilter === 'all'
        ? allProducts.filter((p) => !p.is_draft)
        : allProducts.filter((p) => !p.is_draft && p.category === categoryFilter)
    return dailyStats.map(
      (d) => productList.filter((p) => (p.created_at ?? '').slice(0, 10) <= d.date).length,
    )
  }, [dailyStats, allProducts, categoryFilter])

  const hasChartData = chartStats.some((d) => d.views > 0 || d.enquiries > 0 || d.subscribers > 0)

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

      <section className="mt-7">
        <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">
          Daily activity
        </h2>
        <p className="mb-3 text-sm text-night-700/80 dark:text-cream-300/60">
          Views, enquiries, and new notification opt-ins per day.
        </p>
        <ChartControls
          preset={preset} setPreset={setPreset}
          customStart={customStart} customEnd={customEnd}
          setCustomStart={setCustomStart} setCustomEnd={setCustomEnd}
          categories={categories} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        />
        {hasChartData || chartStats.length > 0 ? (
          <DailyChart stats={chartStats} piecesPerDay={piecesByDay} />
        ) : (
          <p className="py-8 text-center text-sm text-night-700/60 dark:text-cream-300/50">
            No activity in this period.
          </p>
        )}
      </section>

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
