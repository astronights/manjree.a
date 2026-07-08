// Device-local memory of which pieces this customer enquired about (the
// "reserved for me" idea from the design doc). Purely a personal reminder on
// this device — it is not a reservation lock and is never shown to others.

const KEY = 'manjrees.enquired'

function read(): Record<string, string> {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}

export function markEnquired(productId: string): void {
  const all = read()
  all[productId] = new Date().toISOString()
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function enquiredAt(productId: string): string | null {
  return read()[productId] ?? null
}
