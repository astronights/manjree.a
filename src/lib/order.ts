import { isNew } from './store'
import { onSale, salePercent } from './pricing'
import type { Engagement, OrderStrategy } from './ordering'
import type { Product } from '../types'

const priceOf = (p: Product) => (onSale(p) ? p.sale_price! : p.price)

const byNewest = (a: Product, b: Product) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

// Smart Mix banding: new arrivals, then on-sale, then the rest.
function band(p: Product): number {
  if (isNew(p)) return 0
  if (onSale(p)) return 1
  return 2
}
const smartCmp = (a: Product, b: Product) => band(a) - band(b) || byNewest(a, b)

function comparator(strategy: OrderStrategy, engagement?: Engagement) {
  switch (strategy) {
    case 'newest':
      return byNewest
    case 'price_asc':
      return (a: Product, b: Product) => priceOf(a) - priceOf(b) || byNewest(a, b)
    case 'price_desc':
      return (a: Product, b: Product) => priceOf(b) - priceOf(a) || byNewest(a, b)
    case 'deals':
      return (a: Product, b: Product) => {
        const da = onSale(a) ? salePercent(a) : -1
        const db = onSale(b) ? salePercent(b) : -1
        return db - da || byNewest(a, b)
      }
    case 'trending':
      // Popular pieces first; those with no engagement fall back to Smart Mix
      // position, so brand-new stock with no views yet isn't buried at random.
      return (a: Product, b: Product) => {
        const sa = engagement?.get(a.id) ?? 0
        const sb = engagement?.get(b.id) ?? 0
        return sb - sa || smartCmp(a, b)
      }
    case 'smart':
    default:
      return smartCmp
  }
}

// The universal rule: sold-out pieces always sink to the bottom (they stay
// browsable/enquirable, just never bury live stock). The chosen strategy then
// orders within the in-stock group. When the customer has explicitly filtered
// to sold-out only, the sink is a harmless no-op.
export function orderProducts(
  products: Product[],
  strategy: OrderStrategy = 'smart',
  engagement?: Engagement,
): Product[] {
  const cmp = comparator(strategy, engagement)
  return [...products].sort(
    (a, b) =>
      Number(a.stock_status === 'sold_out') - Number(b.stock_status === 'sold_out') || cmp(a, b),
  )
}

// Back-compat helper used where the default order is wanted directly.
export const smartOrder = (products: Product[]): Product[] => orderProducts(products, 'smart')
