import { computeFunnel, fetchEvents, recordEvent, recordFilterUse, recordViewOnce, summarize, summarizeFilters } from './analytics'
import { getDeviceId } from './device'
import { seedProducts } from './seed'
import type { AnalyticsEvent } from '../types'

describe('recordEvent (local mode)', () => {
  it('stores events keyed by a stable anonymous device id', async () => {
    await recordEvent('view', 'p1')
    await recordEvent('enquiry', 'p1')
    const events = await fetchEvents()
    expect(events).toHaveLength(2)
    expect(events[0].device_id).toBe(getDeviceId())
    expect(events[0].device_id).toBe(events[1].device_id)
    expect(events.map((e) => e.event_type)).toEqual(['view', 'enquiry'])
  })
})

describe('recordViewOnce', () => {
  it('records a view only once per product per session', async () => {
    recordViewOnce('p1')
    recordViewOnce('p1')
    recordViewOnce('p2')
    expect((await fetchEvents()).filter((e) => e.event_type === 'view')).toHaveLength(2)
  })
})

describe('recordFilterUse', () => {
  it('stores the payload and dedupes per value per session', async () => {
    recordFilterUse('size', '40')
    recordFilterUse('size', '40')
    recordFilterUse('size', '42')
    recordFilterUse('search', '  red kurti  ')
    recordFilterUse('search', '') // ignored
    const events = await fetchEvents()
    const filters = events.filter((e) => e.event_type === 'filter')
    expect(filters).toHaveLength(3)
    expect(filters[0]).toMatchObject({ product_id: null, payload: { kind: 'size', value: '40' } })
    expect(filters[2].payload).toEqual({ kind: 'search', value: 'red kurti' })
  })
})

describe('summarizeFilters', () => {
  it('counts top values per kind', async () => {
    recordFilterUse('size', '40')
    recordFilterUse('size', '42')
    sessionStorage.clear() // simulate a second visit
    recordFilterUse('size', '40')
    recordFilterUse('category', 'Saree')
    const stats = summarizeFilters(await fetchEvents())
    expect(stats.get('size')).toEqual([
      { value: '40', count: 2 },
      { value: '42', count: 1 },
    ])
    expect(stats.get('category')).toEqual([{ value: 'Saree', count: 1 }])
  })

  it('filter events do not distort product or view stats', async () => {
    recordViewOnce('p1')
    recordFilterUse('size', '38')
    const { totals, byProduct } = summarize(await fetchEvents(), seedProducts)
    expect(totals.views).toBe(1)
    expect(byProduct).toHaveLength(1)
  })
})

describe('computeFunnel', () => {
  it('counts visitors, viewers and enquirers by device', async () => {
    recordViewOnce('p1')
    await recordEvent('enquiry', 'p1')
    recordFilterUse('size', '40') // same device, already a viewer
    const { byDevice } = summarize(await fetchEvents(), seedProducts)
    expect(computeFunnel(byDevice)).toEqual({ devices: 1, viewers: 1, enquirers: 1 })
    expect(computeFunnel([])).toEqual({ devices: 0, viewers: 0, enquirers: 0 })
  })
})

describe('summarize', () => {
  const device = (n: string) => `device-${n}`
  const at = (h: number) => new Date(Date.UTC(2026, 0, 1, h)).toISOString()
  const events: AnalyticsEvent[] = [
    { device_id: device('a'), product_id: seedProducts[0].id, event_type: 'view', created_at: at(1) },
    { device_id: device('a'), product_id: seedProducts[0].id, event_type: 'enquiry', created_at: at(2) },
    { device_id: device('b'), product_id: seedProducts[0].id, event_type: 'view', created_at: at(3) },
    { device_id: device('b'), product_id: seedProducts[1].id, event_type: 'view', created_at: at(4) },
    { device_id: device('b'), product_id: 'gone', event_type: 'view', created_at: at(5) },
  ]

  it('computes totals across all events', () => {
    const { totals } = summarize(events, seedProducts)
    expect(totals).toEqual({ views: 4, enquiries: 1, devices: 2 })
  })

  it('ranks products by views and joins product data', () => {
    const { byProduct } = summarize(events, seedProducts)
    expect(byProduct[0].product?.id).toBe(seedProducts[0].id)
    expect(byProduct[0]).toMatchObject({ views: 2, enquiries: 1 })
  })

  it('keeps events for deleted products with a null product', () => {
    const { byProduct } = summarize(events, seedProducts)
    const orphan = byProduct.find((r) => r.product === null)
    expect(orphan).toMatchObject({ views: 1, enquiries: 0 })
  })

  it('orders devices by most recent activity', () => {
    const { byDevice } = summarize(events, seedProducts)
    expect(byDevice[0].deviceId).toBe(device('b'))
    expect(byDevice[0].lastActive).toBe(at(5))
    expect(byDevice[1]).toMatchObject({ deviceId: device('a'), views: 1, enquiries: 1 })
  })
})
