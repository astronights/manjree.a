export type StockStatus = 'in_stock' | 'sold_out' | 'on_order'

export interface Product {
  id: string
  title: string
  description: string
  price: number
  sale_price: number | null
  category: string
  sizes: string[]
  images: string[]
  is_new_arrival: boolean
  new_until: string | null
  stock_status: StockStatus
  is_draft: boolean
  show_price: boolean
  collection: string | null
  created_at: string
}

// A piece being created: the backend assigns id and created_at.
export type ProductInput = Omit<Product, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type EventType = 'view' | 'enquiry' | 'filter' | 'favorite'

export type FilterKind = 'search' | 'size' | 'availability' | 'collection' | 'sort' | 'category'

export interface FilterPayload {
  kind: FilterKind
  value: string
}

export interface AnalyticsEvent {
  device_id: string
  product_id: string | null
  event_type: EventType
  payload?: FilterPayload | null
  created_at: string
}
