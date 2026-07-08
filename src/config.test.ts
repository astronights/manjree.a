import { formatPrice, whatsappLink } from './config'
import { seedProducts } from './lib/seed'

describe('formatPrice', () => {
  it('formats with the rupee symbol and Indian digit grouping', () => {
    expect(formatPrice(1450)).toBe('₹1,450')
    expect(formatPrice(125000)).toBe('₹1,25,000')
  })
})

describe('whatsappLink', () => {
  const product = seedProducts[0]

  it('deep-links to wa.me with the piece title, ref code and product URL', () => {
    const url = new URL(whatsappLink(product))
    expect(url.hostname).toBe('wa.me')
    const text = url.searchParams.get('text')!
    expect(text).toContain(product.title)
    expect(text).toContain(`Ref: ${product.id.slice(0, 8).toUpperCase()}`)
    expect(text).toContain(`/product/${product.id}`)
    expect(text).not.toContain('Size:')
  })

  it('includes the chosen size when one is selected', () => {
    const text = new URL(whatsappLink(product, 'M')).searchParams.get('text')!
    expect(text).toContain('Size: M')
  })
})
