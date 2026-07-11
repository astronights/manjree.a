// Ordering strategies for the customer catalog's "Recommended" order, plus the
// admin-configurable mapping of which strategy applies where. Kept dependency-
// free (pure types/data) so both the sorter (order.ts) and settings.ts can
// import it without a cycle.

export type OrderStrategy = 'smart' | 'newest' | 'trending' | 'deals' | 'price_asc' | 'price_desc'

export const ORDER_STRATEGIES: { value: OrderStrategy; label: string; description: string }[] = [
  {
    value: 'smart',
    label: 'Smart Mix',
    description: 'New arrivals first, then sale pieces, then the rest — newest within each group. A balanced default.',
  },
  {
    value: 'newest',
    label: 'Fresh Drop',
    description: 'Newest additions first, like a live feed.',
  },
  {
    value: 'trending',
    label: 'Trending',
    description: 'Most viewed, saved and enquired pieces (last 30 days) rise to the top — pushes what’s selling.',
  },
  {
    value: 'deals',
    label: 'Best Deals',
    description: 'Biggest discounts first, then full-price pieces.',
  },
  {
    value: 'price_asc',
    label: 'Price: Low to High',
    description: 'Cheapest first — good for budget browsing.',
  },
  {
    value: 'price_desc',
    label: 'Price: High to Low',
    description: 'Premium, statement pieces first.',
  },
]

const VALID = new Set(ORDER_STRATEGIES.map((s) => s.value))
export const isStrategy = (v: unknown): v is OrderStrategy =>
  typeof v === 'string' && VALID.has(v as OrderStrategy)

export function strategyLabel(v: OrderStrategy): string {
  return ORDER_STRATEGIES.find((s) => s.value === v)?.label ?? v
}

// productId -> engagement score (higher = more popular). Empty/undefined in
// local demo mode or before the aggregate loads.
export type Engagement = Map<string, number>

export interface OrderingConfig {
  default: OrderStrategy
  byHighlight: Record<string, OrderStrategy> // keys: 'new' | 'sale'
  byCollection: Record<string, OrderStrategy> // collection name -> strategy
  byCategory: Record<string, OrderStrategy> // category name -> strategy
}

export const defaultOrdering: OrderingConfig = {
  default: 'smart',
  byHighlight: {},
  byCollection: {},
  byCategory: {},
}

function sanitizeMap(value: unknown): Record<string, OrderStrategy> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, OrderStrategy> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isStrategy(v)) out[k] = v
  }
  return out
}

export function sanitizeOrdering(value: unknown): OrderingConfig {
  const raw = (value ?? {}) as Partial<OrderingConfig>
  return {
    default: isStrategy(raw.default) ? raw.default : 'smart',
    byHighlight: sanitizeMap(raw.byHighlight),
    byCollection: sanitizeMap(raw.byCollection),
    byCategory: sanitizeMap(raw.byCategory),
  }
}

// Model B under the hood: most-specific wins — collection → highlight →
// category → default. Personal lists (Saved / Enquired) never reach here;
// the catalog orders those by the customer's own action time.
export function resolveStrategy(
  ordering: OrderingConfig,
  ctx: { collection?: string | null; highlight?: string | null; category?: string | null },
): OrderStrategy {
  if (ctx.collection && ordering.byCollection[ctx.collection]) return ordering.byCollection[ctx.collection]
  if (ctx.highlight && ordering.byHighlight[ctx.highlight]) return ordering.byHighlight[ctx.highlight]
  if (ctx.category && ordering.byCategory[ctx.category]) return ordering.byCategory[ctx.category]
  return ordering.default
}
