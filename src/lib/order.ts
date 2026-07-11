import { isNew } from './store'
import { onSale } from './pricing'
import type { Product } from '../types'

// The customer catalog's default ("Recommended") order, in bands:
//   1. current new arrivals
//   2. pieces on sale
//   3. everything else
//   4. sold out (still browsable/enquirable, but never buries fresh stock)
// Newest first within each band. Collections deliberately don't affect rank —
// they have their own dropdown as a showcase.
function band(p: Product): number {
  if (p.stock_status === 'sold_out') return 3
  if (isNew(p)) return 0
  if (onSale(p)) return 1
  return 2
}

export function smartOrder(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) =>
      band(a) - band(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}
