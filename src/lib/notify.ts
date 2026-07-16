// Notification presets: each type fills default copy and the deep link the
// notification opens (mirrors the customer catalog's Highlights params).

export type NotifyType = 'new' | 'sale' | 'collection'

export interface NotifyDraft {
  title: string
  body: string
  url: string
}

export function notifyDefaults(type: NotifyType, collection?: string): NotifyDraft {
  switch (type) {
    case 'sale':
      return {
        title: 'New pieces on sale 🏷️',
        body: 'Fresh markdowns just landed — tap to shop the deals.',
        url: '/?hl=sale',
      }
    case 'collection': {
      const name = collection?.trim() || 'our latest'
      return {
        title: `New in ${name} ✦`,
        body: `The ${name} collection just got new pieces.`,
        url: `/?${new URLSearchParams({ hl: `c:${name}` })}`,
      }
    }
    case 'new':
    default:
      return {
        title: 'New arrivals just dropped ✨',
        body: 'Be the first to see the latest pieces.',
        url: '/',
      }
  }
}
