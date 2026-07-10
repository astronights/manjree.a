// Sample pieces for local demo mode so the app looks alive on first run.
// Images are inline SVG placeholders in the brand palette; real product
// photos replace these the moment actual pieces are added.

import type { Product } from '../types'

function placeholder(label: string, bg: string, fg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750">
    <rect width="600" height="750" fill="${bg}"/>
    <circle cx="300" cy="330" r="150" fill="${fg}" opacity="0.25"/>
    <circle cx="300" cy="330" r="100" fill="${fg}" opacity="0.35"/>
    <text x="300" y="580" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${fg}">${label}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const now = Date.now()
const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

export const seedProducts: Product[] = [
  {
    id: 'demo-anarkali-marigold',
    title: 'Marigold Anarkali Kurti',
    description:
      'Flowy cotton anarkali in a warm marigold shade with delicate gota detailing at the neckline. Perfect for festive daywear.',
    price: 1450,
    sale_price: null,
    category: 'Kurti',
    sizes: ['38', '40', '42', '44'],
    images: [
      placeholder('Marigold Anarkali', '#faeec6', '#b0880d'),
      placeholder('Fabric close-up', '#fdf8e9', '#d3a512'),
    ],
    is_new_arrival: true,
    new_until: days(-2),
    stock_status: 'in_stock',
    is_draft: false,
    pinned: true,
    show_price: true,
    collection: 'Festive Edit',
    created_at: days(1),
  },
  {
    id: 'demo-suitset-fuchsia',
    title: 'Fuchsia Chanderi Suit Set',
    description:
      'Three-piece chanderi silk suit set — kurta, palazzo and organza dupatta — in bougainvillea pink with zari border.',
    price: 3250,
    sale_price: null,
    category: 'Kurti Set',
    sizes: ['40', '42', '44'],
    images: [placeholder('Fuchsia Suit Set', '#f8e3ec', '#c2185b')],
    is_new_arrival: true,
    new_until: days(-1),
    stock_status: 'in_stock',
    is_draft: false,
    pinned: false,
    show_price: true,
    collection: 'Festive Edit',
    created_at: days(2),
  },
  {
    id: 'demo-saree-leafgreen',
    title: 'Leaf Green Cotton Saree',
    description:
      'Handloom cotton saree in deep leaf green with a thin marigold border. Lightweight and easy to drape for everyday elegance.',
    price: 2100,
    sale_price: 1799,
    category: 'Saree',
    sizes: [],
    images: [placeholder('Green Cotton Saree', '#e6efe6', '#2e7d32')],
    is_new_arrival: false,
    new_until: null,
    stock_status: 'in_stock',
    is_draft: false,
    pinned: false,
    show_price: true,
    collection: null,
    created_at: days(9),
  },
  {
    id: 'demo-kurti-cream',
    title: 'Cream Chikankari Kurti',
    description:
      'Classic Lucknowi chikankari on soft cream mul cotton. Pairs with everything — a wardrobe staple.',
    price: 1150,
    sale_price: null,
    category: 'Kurti',
    sizes: ['36', '38', '40', '42', '44', '46'],
    images: [placeholder('Chikankari Kurti', '#f2ebdc', '#8a690b')],
    is_new_arrival: false,
    new_until: null,
    stock_status: 'sold_out',
    is_draft: false,
    pinned: false,
    show_price: true,
    collection: null,
    created_at: days(20),
  },
  {
    id: 'demo-dupatta-sunset',
    title: 'Sunset Ombre Dupatta',
    description:
      'Georgette dupatta in a marigold-to-pink ombre with tassel edging. Instant lift for plain suits.',
    price: 750,
    sale_price: null,
    category: 'Dupatta',
    sizes: [],
    images: [placeholder('Ombre Dupatta', '#fdf1e0', '#e0447c')],
    is_new_arrival: false,
    new_until: null,
    stock_status: 'on_order',
    is_draft: false,
    pinned: false,
    show_price: true,
    collection: null,
    created_at: days(15),
  },
]
