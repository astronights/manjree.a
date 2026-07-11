// Device-local saved pieces ("My pieces"), like the enquiry memory: no
// account, stored in this browser only.

import { recordFavorite } from './analytics'

const KEY = 'manjrees.favorites'

function read(): Record<string, string> {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}

export function isFavorite(productId: string): boolean {
  return productId in read()
}

export function toggleFavorite(productId: string): boolean {
  const all = read()
  const nowSaved = !(productId in all)
  if (nowSaved) {
    all[productId] = new Date().toISOString()
    recordFavorite(productId)
  } else {
    delete all[productId]
  }
  localStorage.setItem(KEY, JSON.stringify(all))
  // Lets the catalog refresh its "My Pieces" option without a reload.
  window.dispatchEvent(new Event('manjrees:favorites'))
  return nowSaved
}

export function favoriteIds(): Record<string, string> {
  return read()
}
