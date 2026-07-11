import { defaultOrdering, resolveStrategy, sanitizeOrdering } from './ordering'

describe('sanitizeOrdering', () => {
  it('falls back to Smart Mix and empty maps', () => {
    expect(sanitizeOrdering(null)).toEqual(defaultOrdering)
    expect(sanitizeOrdering({ default: 'bogus' }).default).toBe('smart')
  })

  it('keeps valid strategies and drops invalid map values', () => {
    const clean = sanitizeOrdering({
      default: 'newest',
      byHighlight: { new: 'trending', sale: 'nope' },
      byCategory: { Saree: 'price_desc' },
    })
    expect(clean.default).toBe('newest')
    expect(clean.byHighlight).toEqual({ new: 'trending' })
    expect(clean.byCategory).toEqual({ Saree: 'price_desc' })
  })
})

describe('resolveStrategy precedence', () => {
  const ordering = {
    default: 'smart' as const,
    byHighlight: { sale: 'deals' as const },
    byCollection: { 'Diwali 2026': 'trending' as const },
    byCategory: { Saree: 'price_desc' as const },
  }

  it('collection beats highlight beats category beats default', () => {
    expect(resolveStrategy(ordering, { collection: 'Diwali 2026', highlight: 'sale', category: 'Saree' })).toBe('trending')
    expect(resolveStrategy(ordering, { highlight: 'sale', category: 'Saree' })).toBe('deals')
    expect(resolveStrategy(ordering, { category: 'Saree' })).toBe('price_desc')
    expect(resolveStrategy(ordering, { category: 'Kurti' })).toBe('smart')
    expect(resolveStrategy(ordering, {})).toBe('smart')
  })
})
