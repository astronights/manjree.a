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

export const categories = ['Kurti', 'Suit Set', 'Saree', 'Dupatta', 'Other']

export const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

// How long a piece keeps its "New" treatment after being marked a new arrival.
export const NEW_ARRIVAL_DAYS = 3

export function whatsappLink(product: Product, size?: string): string {
  const ref = product.id.slice(0, 8).toUpperCase()
  const lines = [
    `Hi! I'm interested in *${product.title}* (Ref: ${ref})${size ? ` — Size: ${size}` : ''}. Is it available?`,
    `${window.location.origin}/product/${product.id}`,
  ]
  return `https://wa.me/${shop.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
}

export function formatPrice(value: number | string): string {
  return `${shop.currency}${Number(value).toLocaleString('en-IN')}`
}
