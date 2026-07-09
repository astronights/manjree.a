// Shop settings the admin can edit on /admin/settings: product categories
// and the size range. Stored as key/jsonb rows in Supabase (localStorage in
// demo mode); missing or invalid values fall back to these defaults.

import { supabase } from './supabase'

export const defaultCategories = [
  'Kurti',
  'Kurti Pant',
  'Kurti Set',
  'Unstitched Suit Set',
  'Saree',
  'Dupatta',
  'Kaftan Set',
  'Other',
]

// Indian garment sizes 36–54 in steps of two.
export const defaultSizes = Array.from({ length: 10 }, (_, i) => String(36 + i * 2))

// How long the "New" badge (and New Arrivals tab membership) lasts.
export const defaultNewArrivalDays = 3

export interface ShopSettings {
  categories: string[]
  sizes: string[]
  new_arrival_days: number
}

const LS_KEY = 'manjrees.settings'

function sanitizeList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const list = [...new Set(value.map((v) => String(v).trim()).filter(Boolean))]
  return list.length ? list : fallback
}

function sanitizeDays(value: unknown): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 1 && n <= 60 ? n : defaultNewArrivalDays
}

function withDefaults(raw: {
  categories?: unknown
  sizes?: unknown
  new_arrival_days?: unknown
}): ShopSettings {
  return {
    categories: sanitizeList(raw.categories, defaultCategories),
    sizes: sanitizeList(raw.sizes, defaultSizes),
    new_arrival_days: sanitizeDays(raw.new_arrival_days),
  }
}

export async function getSettings(): Promise<ShopSettings> {
  if (supabase) {
    const { data, error } = await supabase.from('settings').select('key, value')
    if (error) throw error
    return withDefaults(Object.fromEntries(data.map((r) => [r.key, r.value])))
  }
  try {
    return withDefaults(JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') ?? {})
  } catch {
    return withDefaults({})
  }
}

export async function saveSettings(settings: ShopSettings): Promise<ShopSettings> {
  const clean = withDefaults(settings)
  if (supabase) {
    const rows = Object.entries(clean).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('settings').upsert(rows)
    if (error) throw error
    return clean
  }
  localStorage.setItem(LS_KEY, JSON.stringify(clean))
  return clean
}
