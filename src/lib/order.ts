import { isNew } from './store'
import { onSale } from './pricing'
import type { Product } from '../types'

// The customer catalog's default ("Recommended") order, in bands:
//   1. pinned pieces (the admin's manual hero picks — pin always wins)
//   2. current new arrivals
//   3. pieces on sale
//   4. everything else
//   5. sold out (still browsable/enquirable, but never buries fresh stock)
// Newest first within each band. Collections deliberately don't affect rank —
// they have their own chips row as a showcase.
function band(p: Product): number {
  if (p.pinned) return 0
  if (p.stock_status === 'sold_out') return 4
  if (isNew(p)) return 1
  if (onSale(p)) return 2
  return 3
}

export function smartOrder(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) =>
      band(a) - band(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}
