// Analytics events: product views and WhatsApp enquiry clicks, keyed by the
// anonymous device id. Supabase mode inserts into the events table (insert
// open to everyone, readable only by the admin); local demo mode appends to
// localStorage so the analytics page works without a backend too.

import { supabase } from './supabase'
import { getDeviceId } from './device'
import type { AnalyticsEvent, EventType, Product } from '../types'

const LS_EVENTS = 'manjrees.events'
const MAX_LOCAL_EVENTS = 5000

function localEvents(): AnalyticsEvent[] {
  try {
    return (JSON.parse(localStorage.getItem(LS_EVENTS) ?? 'null') as AnalyticsEvent[]) ?? []
  } catch {
    return []
  }
}

export async function recordEvent(eventType: EventType, productId: string): Promise<void> {
  const row = { device_id: getDeviceId(), product_id: productId, event_type: eventType }
  if (supabase) {
    await supabase.from('events').insert(row)
    return
  }
  const all = localEvents()
  all.push({ ...row, created_at: new Date().toISOString() })
  localStorage.setItem(LS_EVENTS, JSON.stringify(all.slice(-MAX_LOCAL_EVENTS)))
}

// Record a view at most once per product per browser session, so refreshes
// and back-and-forth navigation don't inflate the numbers.
export function recordViewOnce(productId: string): void {
  const key = `manjrees.viewed.${productId}`
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  recordEvent('view', productId).catch(() => {})
}

// Admin only (RLS blocks anonymous reads in Supabase mode).
export async function fetchEvents(): Promise<AnalyticsEvent[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('events')
      .select('device_id, product_id, event_type, created_at')
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
    let p = byProduct.get(e.product_id)
    if (!p) {
      p = { product: productById.get(e.product_id) ?? null, views: 0, enquiries: 0 }
      byProduct.set(e.product_id, p)
    }
    let d = byDevice.get(e.device_id)
    if (!d) {
      d = { deviceId: e.device_id, views: 0, enquiries: 0, lastActive: e.created_at }
      byDevice.set(e.device_id, d)
    }
    if (e.event_type === 'view') {
      p.views++
      d.views++
    } else {
      p.enquiries++
      d.enquiries++
    }
    if (e.created_at > d.lastActive) d.lastActive = e.created_at
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
