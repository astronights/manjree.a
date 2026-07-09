import { seedProducts } from './seed'
import { deleteProduct, getProduct, isNew, listProducts, saveProduct, signIn, signOut, isAdmin } from './store'
import type { Product } from '../types'

const base: Omit<Product, 'id' | 'created_at'> = {
  title: 'Test Kurti',
  description: 'A test piece',
  price: 999,
  category: 'Kurti',
  sizes: ['40'],
  images: ['data:image/svg+xml,x'],
  is_new_arrival: false,
  new_until: null,
  in_stock: true,
  is_draft: false,
  pinned: false,
  show_price: true,
  collection: null,
}

describe('local product store', () => {
  it('seeds sample pieces on first read', async () => {
    const products = await listProducts()
    expect(products.length).toBeGreaterThan(0)
    expect(products.map((p) => p.id)).toContain('demo-anarkali-marigold')
  })

  it('creates a product with generated id and created_at', async () => {
    const saved = await saveProduct({ ...base })
    expect(saved.id).toBeTruthy()
    expect(saved.created_at).toBeTruthy()
    expect(await getProduct(saved.id)).toMatchObject({ title: 'Test Kurti' })
  })

  it('updates an existing product in place', async () => {
    const saved = await saveProduct({ ...base })
    await saveProduct({ ...saved, title: 'Renamed' })
    expect((await getProduct(saved.id))?.title).toBe('Renamed')
    const all = await listProducts({ includeDrafts: true })
    expect(all.filter((p) => p.id === saved.id)).toHaveLength(1)
  })

  it('hides drafts from the public listing but not from the admin listing', async () => {
    const draft = await saveProduct({ ...base, is_draft: true })
    const publicIds = (await listProducts()).map((p) => p.id)
    const adminIds = (await listProducts({ includeDrafts: true })).map((p) => p.id)
    expect(publicIds).not.toContain(draft.id)
    expect(adminIds).toContain(draft.id)
  })

  it('sorts pinned pieces first, then newest first', async () => {
    const products = await listProducts()
    const firstUnpinned = products.findIndex((p) => !p.pinned)
    expect(products.slice(0, firstUnpinned).every((p) => p.pinned)).toBe(true)
    const rest = products.slice(firstUnpinned)
    const times = rest.map((p) => new Date(p.created_at).getTime())
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('deletes a product', async () => {
    const saved = await saveProduct({ ...base })
    await deleteProduct(saved.id)
    expect(await getProduct(saved.id)).toBeNull()
  })
})

describe('isNew', () => {
  const product = seedProducts[0]

  it('is false when the flag is off', () => {
    expect(isNew({ ...product, is_new_arrival: false })).toBe(false)
  })

  it('is true while new_until is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isNew({ ...product, is_new_arrival: true, new_until: future })).toBe(true)
  })

  it('expires once new_until has passed', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(isNew({ ...product, is_new_arrival: true, new_until: past })).toBe(false)
  })
})

describe('local admin auth', () => {
  it('rejects a wrong passcode and accepts the demo one', async () => {
    await expect(signIn({ passcode: 'nope' })).rejects.toThrow('Incorrect passcode')
    expect(await isAdmin()).toBe(false)
    await signIn({ passcode: '1234' })
    expect(await isAdmin()).toBe(true)
    await signOut()
    expect(await isAdmin()).toBe(false)
  })
})
