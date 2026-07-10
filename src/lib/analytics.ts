// Analytics events: product views and WhatsApp enquiry clicks, keyed by the
// anonymous device id. Supabase mode inserts into the events table (insert
// open to everyone, readable only by the admin); local demo mode appends to
// localStorage so the analytics page works without a backend too.

import { supabase } from './supabase'
import { getDeviceId } from './device'
import type { AnalyticsEvent, EventType, FilterKind, FilterPayload, Product } from '../types'

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
    const { data, error } = await supabase
      .from('events')
      .select('device_id, product_id, event_type, payload, created_at')
    if (error) throw error
    return data as AnalyticsEvent[]
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
    // Filter events keep the device active but have no product side.
    if (e.event_type === 'filter' || !e.product_id) continue

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
