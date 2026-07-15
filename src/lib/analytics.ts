// Analytics events: product views and WhatsApp enquiry clicks, keyed by the
// anonymous device id. Supabase mode inserts into the events table (insert
// open to everyone, readable only by the admin); local demo mode appends to
// localStorage so the analytics page works without a backend too.

import { supabase } from './supabase'
import { getDeviceId } from './device'
import type { AnalyticsEvent, EventType, FilterKind, FilterPayload, Product } from '../types'
import type { Engagement } from './ordering'

const LS_EVENTS = 'manjrees.events'
const MAX_LOCAL_EVENTS = 5000

function localEvents(): AnalyticsEvent[] {
  try {
    return (JSON.parse(localStorage.getItem(LS_EVENTS) ?? 'null') as AnalyticsEvent[]) ?? []
  } catch {
    return []
  }
}

async function insertEvent(row: {
  device_id: string
  product_id: string | null
  event_type: EventType
  payload?: FilterPayload
}): Promise<void> {
  if (supabase) {
    await supabase.from('events').insert(row)
    return
  }
  const all = localEvents()
  all.push({ ...row, created_at: new Date().toISOString() })
  localStorage.setItem(LS_EVENTS, JSON.stringify(all.slice(-MAX_LOCAL_EVENTS)))
}

export async function recordEvent(eventType: EventType, productId: string): Promise<void> {
  await insertEvent({ device_id: getDeviceId(), product_id: productId, event_type: eventType })
}

// Record a view at most once per product per browser session, so refreshes
// and back-and-forth navigation don't inflate the numbers.
export function recordViewOnce(productId: string): void {
  const key = `manjrees.viewed.${productId}`
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  recordEvent('view', productId).catch(() => {})
}

// Record a piece being saved (♥). Once per piece per browser session and only
// on save (not un-save), so trending/engagement isn't inflated by toggling.
export function recordFavorite(productId: string): void {
  const key = `manjrees.faved.${productId}`
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  recordEvent('favorite', productId).catch(() => {})
}

// Record a filter selection (size chosen, search term, category tab, …),
// once per value per browser session so repeated toggling doesn't inflate.
export function recordFilterUse(kind: FilterKind, value: string): void {
  const trimmed = value.trim()
  if (!trimmed) return
  const key = `manjrees.filter.${kind}:${trimmed.toLowerCase()}`
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  insertEvent({
    device_id: getDeviceId(),
    product_id: null,
    event_type: 'filter',
    payload: { kind, value: trimmed },
  }).catch(() => {})
}

// Admin only (RLS blocks anonymous reads in Supabase mode).
export async function fetchEvents(): Promise<AnalyticsEvent[]> {
  if (supabase) {
    let res = await supabase
      .from('events')
      .select('device_id, product_id, event_type, payload, created_at')
    if (res.error) {
      // Database not yet migrated to 0006 (no payload column) — the page
      // still works, just without filter stats.
      res = await supabase.from('events').select('device_id, product_id, event_type, created_at')
      if (res.error) throw res.error
    }
    return res.data as AnalyticsEvent[]
  }
  return localEvents()
}

export interface ProductStats {
  product: Product | null
  views: number
  enquiries: number
}

export interface DeviceStats {
  deviceId: string
  views: number
  enquiries: number
  lastActive: string
}

export interface Summary {
  totals: { views: number; enquiries: number; devices: number }
  byProduct: ProductStats[]
  byDevice: DeviceStats[]
}

export function summarize(events: AnalyticsEvent[], products: Product[]): Summary {
  const productById = new Map(products.map((p) => [p.id, p]))
  const byProduct = new Map<string, ProductStats>()
  const byDevice = new Map<string, DeviceStats>()

  for (const e of events) {
    let d = byDevice.get(e.device_id)
    if (!d) {
      d = { deviceId: e.device_id, views: 0, enquiries: 0, lastActive: e.created_at }
      byDevice.set(e.device_id, d)
    }
    if (e.created_at > d.lastActive) d.lastActive = e.created_at
    // Only views and enquiries feed per-product/device counts here; filter and
    // favorite events keep the device "active" but aren't counted as either.
    if ((e.event_type !== 'view' && e.event_type !== 'enquiry') || !e.product_id) continue

    let p = byProduct.get(e.product_id)
    if (!p) {
      p = { product: productById.get(e.product_id) ?? null, views: 0, enquiries: 0 }
      byProduct.set(e.product_id, p)
    }
    if (e.event_type === 'view') {
      p.views++
      d.views++
    } else {
      p.enquiries++
      d.enquiries++
    }
  }

  return {
    totals: {
      views: events.filter((e) => e.event_type === 'view').length,
      enquiries: events.filter((e) => e.event_type === 'enquiry').length,
      devices: byDevice.size,
    },
    byProduct: [...byProduct.values()].sort((a, b) => b.views - a.views || b.enquiries - a.enquiries),
    byDevice: [...byDevice.values()].sort((a, b) => (a.lastActive < b.lastActive ? 1 : -1)),
  }
}

export interface Funnel {
  devices: number
  viewers: number
  enquirers: number
}

// Visitors → viewed at least one piece → enquired at least once.
export function computeFunnel(byDevice: DeviceStats[]): Funnel {
  return {
    devices: byDevice.length,
    viewers: byDevice.filter((d) => d.views > 0).length,
    enquirers: byDevice.filter((d) => d.enquiries > 0).length,
  }
}

// Per-product engagement for the Trending order: recent views + weighted
// enquiries + saves. Supabase mode calls a security-definer RPC that returns
// only aggregate counts (no device ids); local mode computes from stored
// events. Weighting: an enquiry (3) > a save (2) > a view (1).
export async function fetchEngagement(sinceDays = 30): Promise<Engagement> {
  const score: Engagement = new Map()
  if (supabase) {
    const { data, error } = await supabase.rpc('product_engagement', { since_days: sinceDays })
    if (error || !data) return score
    for (const r of data as { product_id: string; views: number; enquiries: number; saves: number }[]) {
      score.set(r.product_id, Number(r.views) + 3 * Number(r.enquiries) + 2 * Number(r.saves))
    }
    return score
  }
  const cutoff = Date.now() - sinceDays * 86400000
  const weight: Partial<Record<EventType, number>> = { view: 1, favorite: 2, enquiry: 3 }
  for (const e of localEvents()) {
    if (!e.product_id || new Date(e.created_at).getTime() < cutoff) continue
    const w = weight[e.event_type]
    if (w) score.set(e.product_id, (score.get(e.product_id) ?? 0) + w)
  }
  return score
}

export interface DayStat {
  date: string // YYYY-MM-DD
  views: number
  enquiries: number
  subscribers: number // new opt-ins on that day
}

export function summarizeByDay(
  events: AnalyticsEvent[],
  subDates: string[],
  numDays = 30,
): DayStat[] {
  const byDate = new Map<string, DayStat>()
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    byDate.set(date, { date, views: 0, enquiries: 0, subscribers: 0 })
  }
  for (const e of events) {
    const day = byDate.get(e.created_at.slice(0, 10))
    if (!day) continue
    if (e.event_type === 'view') day.views++
    else if (e.event_type === 'enquiry') day.enquiries++
  }
  for (const dt of subDates) {
    if (typeof dt !== 'string') continue
    const day = byDate.get(dt.slice(0, 10))
    if (day) day.subscribers++
  }
  return [...byDate.values()]
}

export interface FilterStat {
  value: string
  count: number
}

// Top values per filter kind (search terms, sizes, categories, …), for the
// "Popular filters" section of the analytics page.
export function summarizeFilters(events: AnalyticsEvent[], top = 5): Map<FilterKind, FilterStat[]> {
  const counts = new Map<FilterKind, Map<string, number>>()
  for (const e of events) {
    if (e.event_type !== 'filter' || !e.payload?.kind || !e.payload.value) continue
    const kind = counts.get(e.payload.kind) ?? new Map<string, number>()
    kind.set(e.payload.value, (kind.get(e.payload.value) ?? 0) + 1)
    counts.set(e.payload.kind, kind)
  }
  const result = new Map<FilterKind, FilterStat[]>()
  for (const [kind, values] of counts) {
    result.set(
      kind,
      [...values.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, top),
    )
  }
  return result
}
