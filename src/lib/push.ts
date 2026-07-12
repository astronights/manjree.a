// Web Push opt-in on the customer side. Configured only when a VAPID public
// key is present; otherwise the opt-in UI stays hidden (e.g. local demo).

import { getDeviceId } from './device'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const VIEWED_KEY = 'manjrees.piecesViewed'

export function pushConfigured(): boolean {
  return (
    Boolean(VAPID_PUBLIC) &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export type PushPermission = 'unsupported' | 'default' | 'granted' | 'denied'

export function pushPermission(): PushPermission {
  if (!pushConfigured()) return 'unsupported'
  return Notification.permission
}

// Count of distinct pieces this device has opened — used to time the opt-in
// prompt (after ~2 pieces, per the design doc: not on first load).
export function notePieceViewed(productId: string): void {
  const key = `manjrees.pv.${productId}`
  if (localStorage.getItem(key)) return
  localStorage.setItem(key, '1')
  localStorage.setItem(VIEWED_KEY, String(piecesViewed() + 1))
}

export function piecesViewed(): number {
  return Number(localStorage.getItem(VIEWED_KEY) || '0')
}

export function hasViewedProduct(productId: string): boolean {
  return Boolean(localStorage.getItem(`manjrees.pv.${productId}`))
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Unsubscribes the browser and removes the record from the server.
export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await fetch('/api/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {})
}

// Returns whether the browser currently has an active push subscription.
export async function isSubscribed(): Promise<boolean> {
  if (!pushConfigured()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    return Boolean(await reg.pushManager.getSubscription())
  } catch {
    return false
  }
}

// Requests permission, subscribes, and stores the subscription server-side.
// Returns true when subscribed; false if the customer declined.
export async function subscribeToPush(): Promise<boolean> {
  if (!pushConfigured()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!),
    }))

  const json = sub.toJSON()
  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId(), endpoint: sub.endpoint, keys: json.keys }),
  })
  return true
}
