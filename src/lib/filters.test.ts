import { applyFilters, countActiveFilters, emptyFilters, filtersFromParams, filtersToParams } from './filters'
import { seedProducts } from './seed'

const f = (patch: Partial<typeof emptyFilters>) => ({ ...emptyFilters, ...patch })

describe('applyFilters', () => {
  it('matches the query against title, description, category and collection', () => {
    expect(applyFilters(seedProducts, f({ query: 'chikankari' }))).toHaveLength(1)
    expect(applyFilters(seedProducts, f({ query: 'SAREE' }))).toHaveLength(1)
    expect(applyFilters(seedProducts, f({ query: 'festive edit' }))).toHaveLength(2)
    expect(applyFilters(seedProducts, f({ query: 'zzz-nothing' }))).toHaveLength(0)
  })

  it('combines size and availability filters', () => {
    const result = applyFilters(seedProducts, f({ sizes: ['38'], availability: 'in_stock' }))
    expect(result.map((p) => p.title)).toEqual([
      'Marigold Anarkali Kurti',
      'Leaf Green Cotton Saree',
    ])
  })

  it('size filters keep free-size pieces (sarees, dupattas)', () => {
    const result = applyFilters(seedProducts, f({ sizes: ['38'] }))
    const titles = result.map((p) => p.title)
    expect(titles).toContain('Marigold Anarkali Kurti') // has 38
    expect(titles).toContain('Leaf Green Cotton Saree') // free-size
    expect(titles).not.toContain('Fuchsia Chanderi Suit Set') // 40-44 only
  })

  it('filters by availability', () => {
    expect(applyFilters(seedProducts, f({ availability: 'on_order' }))).toHaveLength(1)
    expect(applyFilters(seedProducts, f({ availability: 'sold_out' }))[0].title).toBe(
      'Cream Chikankari Kurti',
    )
  })

})

describe('sort orders', () => {
  it('featured keeps the incoming (pinned-first) order', () => {
    const result = applyFilters(seedProducts, emptyFilters)
    expect(result.map((p) => p.id)).toEqual(seedProducts.map((p) => p.id))
  })

  it('sorts by price both ways', () => {
    const asc = applyFilters(seedProducts, f({ sort: 'price_asc' })).map((p) => p.price)
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    const desc = applyFilters(seedProducts, f({ sort: 'price_desc' })).map((p) => p.price)
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
  })

  it('newest ignores pinning', () => {
    const newest = applyFilters(seedProducts, f({ sort: 'newest' })).map((p) => p.created_at)
    expect(newest).toEqual([...newest].sort((a, b) => (a < b ? 1 : -1)))
  })
})

describe('countActiveFilters', () => {
  it('counts each active filter group once, ignoring the query', () => {
    expect(countActiveFilters(emptyFilters)).toBe(0)
    expect(countActiveFilters(f({ query: 'x' }))).toBe(0)
    expect(countActiveFilters(f({ sizes: ['38', '40'], availability: 'in_stock' }))).toBe(2)
    expect(countActiveFilters(f({ sort: 'price_asc' }))).toBe(1)
  })
})

describe('URL round-trip', () => {
  it('serialises and parses filters and category', () => {
    const filters = f({ query: 'kurti', sizes: ['38', '40'], availability: 'in_stock', sort: 'price_desc' })
    const params = filtersToParams(filters, 'Kurti')
    const parsed = filtersFromParams(params)
    expect(parsed.filters).toEqual(filters)
    expect(parsed.category).toBe('Kurti')
  })

  it('ignores junk availability values', () => {
    expect(filtersFromParams(new URLSearchParams('avail=hacker')).filters.availability).toBeNull()
  })
})
