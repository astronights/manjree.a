// Shop-level configuration. Everything brand-specific lives here so the app
// can be re-skinned for another seller without touching component code.

import type { Product } from './types'

export const shop = {
  name: "Manjree's",
  tagline: 'Embrace elegance in ethnic wear',
  instagram: 'https://instagram.com/manjree.a',
  // International format, no + or spaces. Placeholder until the real
  // business number is confirmed (see design doc §8).
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '919999999999',
  currency: '₹',
  // Fixed identity of the single admin account in Supabase Auth. The login
  // screen only ever asks for the passcode; this email stays behind the
  // scenes (it never receives mail). Created by `npm run admin:create`.
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL || 'admin@manjrees.local',
}

// Categories, sizes and the "New" badge duration are admin-editable
// settings — see src/lib/settings.ts.

export function whatsappLink(product: Product, size?: string): string {
  const ref = product.id.slice(0, 8).toUpperCase()
  const sizeNote = size ? ` — Size: ${size}` : ''
  let opener: string
  if (product.stock_status === 'sold_out') {
    opener = `Hi! I love *${product.title}* (Ref: ${ref}) but it shows as sold out. Could you let me know when it's back in stock?`
  } else if (product.stock_status === 'on_order') {
    opener = `Hi! I'd like to order *${product.title}* (Ref: ${ref})${sizeNote}. What's the lead time?`
  } else {
    opener = `Hi! I'd like to order *${product.title}* (Ref: ${ref})${sizeNote}. Is it available?`
  }
  const lines = [opener, `${window.location.origin}/product/${product.id}`]
  return `https://wa.me/${shop.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
}

export function whatsappLabel(stockStatus: Product['stock_status']): string {
  if (stockStatus === 'sold_out') return 'Enquire about restock on WhatsApp'
  if (stockStatus === 'on_order') return 'Order on WhatsApp'
  return 'Order on WhatsApp'
}

export function formatPrice(value: number | string): string {
  return `${shop.currency}${Number(value).toLocaleString('en-IN')}`
}
