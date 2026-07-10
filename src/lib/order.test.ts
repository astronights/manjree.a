import { smartOrder } from './order'
import { onSale, salePercent } from './pricing'
import { seedProducts } from './seed'
import type { Product } from '../types'

const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

function piece(patch: Partial<Product>): Product {
  return {
    ...seedProducts[2], // plain in-stock piece as the base
    id: crypto.randomUUID(),
    pinned: false,
    is_new_arrival: false,
    new_until: null,
    sale_price: null,
    stock_status: 'in_stock',
    created_at: days(10),
    ...patch,
  }
}

describe('onSale / salePercent', () => {
  it('requires a positive sale price below the regular price', () => {
    expect(onSale(piece({ price: 1000, sale_price: 799 }))).toBe(true)
    expect(onSale(piece({ price: 1000, sale_price: 1000 }))).toBe(false)
    expect(onSale(piece({ price: 1000, sale_price: 0 }))).toBe(false)
    expect(onSale(piece({ sale_price: null }))).toBe(false)
  })

  it('computes the discount percentage', () => {
    expect(salePercent(piece({ price: 2000, sale_price: 1500 }))).toBe(25)
  })
})

describe('smartOrder', () => {
  it('bands: pinned, new, sale, rest, sold-out last — newest first within bands', () => {
    const soldOut = piece({ title: 'sold', stock_status: 'sold_out', created_at: days(0) })
    const plainOld = piece({ title: 'plain-old', created_at: days(9) })
    const plainNew = piece({ title: 'plain-new', created_at: days(1) })
    const sale = piece({ title: 'sale', price: 1000, sale_price: 700, created_at: days(8) })
    const fresh = piece({ title: 'new', is_new_arrival: true, new_until: days(-2), created_at: days(7) })
    const pinned = piece({ title: 'pinned', pinned: true, stock_status: 'sold_out', created_at: days(20) })

    const order = smartOrder([soldOut, plainOld, plainNew, sale, fresh, pinned]).map((p) => p.title)
    expect(order).toEqual(['pinned', 'new', 'sale', 'plain-new', 'plain-old', 'sold'])
  })

  it('a new arrival that is also on sale ranks in the new band', () => {
    const both = piece({ title: 'both', is_new_arrival: true, new_until: days(-1), sale_price: 500, price: 900 })
    const saleOnly = piece({ title: 'sale-only', sale_price: 500, price: 900, created_at: days(0) })
    expect(smartOrder([saleOnly, both]).map((p) => p.title)).toEqual(['both', 'sale-only'])
  })
})
