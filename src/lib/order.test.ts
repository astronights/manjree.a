import { orderProducts, smartOrder } from './order'
import { onSale, salePercent } from './pricing'
import { seedProducts } from './seed'
import type { Product } from '../types'

const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

function piece(patch: Partial<Product>): Product {
  return {
    ...seedProducts[2], // plain in-stock piece as the base
    id: crypto.randomUUID(),
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
  it('bands: new, sale, rest, sold-out last — newest first within bands', () => {
    const soldOut = piece({ title: 'sold', stock_status: 'sold_out', created_at: days(0) })
    const plainOld = piece({ title: 'plain-old', created_at: days(9) })
    const plainNew = piece({ title: 'plain-new', created_at: days(1) })
    const sale = piece({ title: 'sale', price: 1000, sale_price: 700, created_at: days(8) })
    const fresh = piece({ title: 'new', is_new_arrival: true, new_until: days(-2), created_at: days(7) })

    const order = smartOrder([soldOut, plainOld, plainNew, sale, fresh]).map((p) => p.title)
    expect(order).toEqual(['new', 'sale', 'plain-new', 'plain-old', 'sold'])
  })

  it('a new arrival that is also on sale ranks in the new band', () => {
    const both = piece({ title: 'both', is_new_arrival: true, new_until: days(-1), sale_price: 500, price: 900 })
    const saleOnly = piece({ title: 'sale-only', sale_price: 500, price: 900, created_at: days(0) })
    expect(smartOrder([saleOnly, both]).map((p) => p.title)).toEqual(['both', 'sale-only'])
  })
})

describe('orderProducts strategies', () => {
  const cheap = piece({ title: 'cheap', price: 500 })
  const mid = piece({ title: 'mid', price: 1500, sale_price: 1200 }) // effective 1200
  const dear = piece({ title: 'dear', price: 3000 })
  const soldCheap = piece({ title: 'soldcheap', price: 100, stock_status: 'sold_out' })
  const all = [dear, cheap, mid, soldCheap]

  it('sinks sold-out to the bottom regardless of strategy', () => {
    for (const s of ['smart', 'newest', 'price_asc', 'price_desc', 'deals'] as const) {
      expect(orderProducts(all, s).at(-1)!.title).toBe('soldcheap')
    }
  })

  it('price_asc uses the effective (sale) price, cheapest first among in-stock', () => {
    expect(orderProducts(all, 'price_asc').map((p) => p.title)).toEqual(['cheap', 'mid', 'dear', 'soldcheap'])
  })

  it('price_desc leads with the dearest in-stock piece', () => {
    expect(orderProducts(all, 'price_desc').map((p) => p.title)).toEqual(['dear', 'mid', 'cheap', 'soldcheap'])
  })

  it('deals leads with the biggest discount', () => {
    const bigSale = piece({ title: 'big', price: 1000, sale_price: 500 }) // 50% off
    const smallSale = piece({ title: 'small', price: 1000, sale_price: 900 }) // 10% off
    const noSale = piece({ title: 'full', price: 1000 })
    expect(orderProducts([noSale, smallSale, bigSale], 'deals').map((p) => p.title)).toEqual([
      'big',
      'small',
      'full',
    ])
  })

  it('trending ranks by engagement score, then falls back to smart mix', () => {
    const a = piece({ title: 'a' })
    const b = piece({ title: 'b' })
    const c = piece({ title: 'c' })
    const engagement = new Map([
      [b.id, 10],
      [a.id, 3],
    ]) // c has no engagement
    expect(orderProducts([a, b, c], 'trending', engagement).map((p) => p.title)).toEqual(['b', 'a', 'c'])
  })
})
