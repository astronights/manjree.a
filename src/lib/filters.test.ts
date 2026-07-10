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

  it('filters by collection and combines with other filters', () => {
    const result = applyFilters(seedProducts, f({ collection: 'Festive Edit', sizes: ['38'] }))
    expect(result.map((p) => p.title)).toEqual(['Marigold Anarkali Kurti'])
  })
})

describe('countActiveFilters', () => {
  it('counts each active filter group once, ignoring the query', () => {
    expect(countActiveFilters(emptyFilters)).toBe(0)
    expect(countActiveFilters(f({ query: 'x' }))).toBe(0)
    expect(countActiveFilters(f({ sizes: ['38', '40'], availability: 'in_stock' }))).toBe(2)
  })
})

describe('URL round-trip', () => {
  it('serialises and parses filters and category', () => {
    const filters = f({ query: 'kurti', sizes: ['38', '40'], availability: 'in_stock', collection: 'Festive Edit' })
    const params = filtersToParams(filters, 'Kurti')
    const parsed = filtersFromParams(params)
    expect(parsed.filters).toEqual(filters)
    expect(parsed.category).toBe('Kurti')
  })

  it('ignores junk availability values', () => {
    expect(filtersFromParams(new URLSearchParams('avail=hacker')).filters.availability).toBeNull()
  })
})
