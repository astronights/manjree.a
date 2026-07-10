import type { Product } from '../types'

// A piece is on sale when a valid sale price sits below the regular price.
export function onSale(p: Product): boolean {
  return p.sale_price != null && p.sale_price > 0 && p.sale_price < p.price
}

export function salePercent(p: Product): number {
  return Math.round((1 - p.sale_price! / p.price) * 100)
}
