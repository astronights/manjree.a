// Push + cover-image cache handlers layered onto the generated Workbox SW via
// workbox.importScripts (see vite.config.ts). Plain JS, no build step.
// v5 — proper monochrome badge (white M lettermark SVG)

// Take over immediately whenever a new version installs — no need to close all tabs.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

const COVER_CACHE = 'product-covers'

// Home page sends {type:'CACHE_COVERS', urls:[...]} after the grid renders.
// We fetch-and-store only the cover photo for each product — gallery images
// are left to the network. Old entries for deleted products are evicted too.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_COVERS') return
  const urls = (Array.isArray(event.data.urls) ? event.data.urls : []).filter(
    (u) => typeof u === 'string',
  )
  if (!urls.length) return
  event.waitUntil(
    caches.open(COVER_CACHE).then(async (cache) => {
      // Fetch any URL not already cached.
      await Promise.all(
        urls.map(async (url) => {
          if (await cache.match(url)) return
          try {
            const res = await fetch(url)
            if (res.ok) await cache.put(url, res)
          } catch {
            /* offline — skip */
          }
        }),
      )
      // Evict covers for products that are no longer in the catalog.
      const keys = await cache.keys()
      const live = new Set(urls)
      await Promise.all(keys.filter((r) => !live.has(r.url)).map((r) => cache.delete(r)))
    }),
  )
})

// Serve Supabase storage images from the cover cache when available;
// fall through to the network for gallery images (which aren't cached).
self.addEventListener('fetch', (event) => {
  if (!event.request.url.includes('.supabase.co/storage/')) return
  event.respondWith(
    caches
      .open(COVER_CACHE)
      .then((cache) => cache.match(event.request))
      .then((hit) => hit ?? fetch(event.request)),
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  // Admin's headline is the bold notification title.
  // Android Chrome auto-shows "Manjree's" (PWA name) in the header row.
  const title = data.title || "Manjree's"
  const options = {
    body: data.body || '',
    badge: '/badge-96.svg',
    image: data.image || undefined,
    data: { url: data.url || '/' },
    tag: data.tag || 'manjrees',
  }
  // Browsers require a visible notification for every push, whether or not a
  // tab is open — so always showNotification.
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        if ('focus' in client) {
          try {
            await client.navigate(url)
          } catch {
            /* cross-origin or navigation blocked — just focus */
          }
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })(),
  )
})
