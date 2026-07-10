// Device-local saved pieces ("My pieces"), like the enquiry memory: no
// account, stored in this browser only.

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
  if (productId in all) {
    delete all[productId]
  } else {
    all[productId] = new Date().toISOString()
  }
  localStorage.setItem(KEY, JSON.stringify(all))
  return productId in all
}

export function favoriteIds(): Record<string, string> {
  return read()
}
