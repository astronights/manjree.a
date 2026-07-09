export interface Product {
  id: string
  title: string
  description: string
  price: number
  category: string
  sizes: string[]
  images: string[]
  is_new_arrival: boolean
  new_until: string | null
  in_stock: boolean
  is_draft: boolean
  pinned: boolean
  show_price: boolean
  collection: string | null
  created_at: string
}

// A piece being created: the backend assigns id and created_at.
export type ProductInput = Omit<Product, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type EventType = 'view' | 'enquiry'

export interface AnalyticsEvent {
  device_id: string
  product_id: string
  event_type: EventType
  created_at: string
}
