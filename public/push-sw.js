// Push handlers layered onto the generated Workbox service worker via
// workbox.importScripts (see vite.config.ts). Plain JS, no build step.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = data.title || "Manjree's"
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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
