// Data layer. Two backends behind one interface:
//   - Supabase (products table + storage + auth) when VITE_SUPABASE_* is set
//   - localStorage demo mode otherwise, seeded with sample pieces
// Pages/components only ever import from this module.

import { supabase } from './supabase'
import { seedProducts } from './seed'
import { NEW_ARRIVAL_DAYS, shop } from '../config'
import type { Product, ProductInput } from '../types'

export const isSupabaseMode = Boolean(supabase)

export function isNew(product: Product): boolean {
  if (!product.is_new_arrival) return false
  if (!product.new_until) return true
  return new Date(product.new_until).getTime() > Date.now()
}

export function newUntilFromNow(): string {
  return new Date(Date.now() + NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

function sortProducts(list: Product[]): Product[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

// ---------------------------------------------------------------- local mode

const LS_KEY = 'manjrees.products'
const LS_ADMIN = 'manjrees.admin'

function localRead(): Product[] {
  const raw = localStorage.getItem(LS_KEY)
  if (raw) return JSON.parse(raw) as Product[]
  localStorage.setItem(LS_KEY, JSON.stringify(seedProducts))
  return seedProducts
}

function localWrite(products: Product[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(products))
}

// Compress an image file to a bounded data URL so demo photos fit in
// localStorage. Supabase mode uploads the original instead.
function fileToDataUrl(file: File, maxDim = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

// ------------------------------------------------------------------- products

export async function listProducts({ includeDrafts = false } = {}): Promise<Product[]> {
  if (supabase) {
    let query = supabase.from('products').select('*')
    if (!includeDrafts) query = query.eq('is_draft', false)
    const { data, error } = await query
    if (error) throw error
    return sortProducts(data as Product[])
  }
  const all = localRead()
  return sortProducts(includeDrafts ? all : all.filter((p) => !p.is_draft))
}

export async function getProduct(id: string): Promise<Product | null> {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as Product | null
  }
  return localRead().find((p) => p.id === id) ?? null
}

export async function saveProduct(product: ProductInput): Promise<Product> {
  const record = { ...product }
  if (supabase) {
    if (!record.id) delete record.id
    const { data, error } = await supabase.from('products').upsert(record).select().single()
    if (error) throw error
    return data as Product
  }
  const all = localRead()
  if (record.id) {
    const existing = all.findIndex((p) => p.id === record.id)
    const saved = record as Product
    if (existing >= 0) all[existing] = saved
    else all.push(saved)
    localWrite(all)
    return saved
  }
  const saved: Product = {
    ...record,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  all.push(saved)
  localWrite(all)
  return saved
}

export async function deleteProduct(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    return
  }
  localWrite(localRead().filter((p) => p.id !== id))
}

export async function uploadImages(files: Iterable<File>): Promise<string[]> {
  if (supabase) {
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    return urls
  }
  return Promise.all([...files].map((f) => fileToDataUrl(f)))
}

// ----------------------------------------------------------------------- auth

export async function isAdmin(): Promise<boolean> {
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    return Boolean(data.session)
  }
  return sessionStorage.getItem(LS_ADMIN) === '1'
}

// Admin signs in with a passcode only. In Supabase mode the passcode is the
// password of the fixed admin account (shop.adminEmail); in local demo mode
// it is compared against VITE_DEMO_ADMIN_PIN.
export async function signIn({ passcode }: { passcode: string }): Promise<void> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({
      email: shop.adminEmail,
      password: passcode,
    })
    // Only credential failures become "Incorrect passcode"; anything else
    // (rate limiting, config issues) surfaces as-is so it can be diagnosed.
    if (error) {
      throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect passcode' : error.message)
    }
    return
  }
  const expected = import.meta.env.VITE_DEMO_ADMIN_PIN || '1234'
  if (passcode !== expected) throw new Error('Incorrect passcode')
  sessionStorage.setItem(LS_ADMIN, '1')
}

export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut()
    return
  }
  sessionStorage.removeItem(LS_ADMIN)
}
