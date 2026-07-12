// Vercel serverless function: fans a push notification out to every stored
// subscription. Gated to the single admin — the caller must send their
// Supabase session token (Authorization: Bearer <token>) and it must resolve
// to the admin account. Stale endpoints (404/410) are pruned as we go.
//
// Deliberately does not import from src/ — the frontend reads import.meta.env,
// which doesn't exist in the function runtime.

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'admin@manjrees.local'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' })
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@manjrees.local'

    if (!url || !anonKey || !serviceKey) {
      console.error('send-push: Supabase env vars missing')
      return res.status(500).json({ error: 'Push is not configured on the server' })
    }
    if (!vapidPublic || !vapidPrivate) {
      console.error('send-push: VAPID keys missing')
      return res.status(500).json({ error: 'Push keys are not configured on the server' })
    }

    // --- Admin gate: verify the bearer token belongs to the admin account.
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) {
      return res.status(401).json({ error: 'Not signed in' })
    }
    const authClient = createClient(url, anonKey, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await authClient.auth.getUser(token)
    if (userErr || !userData?.user || userData.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Not authorised' })
    }

    // --- Compose the notification.
    const { title, body, url: link, image } = req.body ?? {}
    if (!title || !body) {
      return res.status(400).json({ error: 'A title and message are required' })
    }
    const payload = JSON.stringify({
      title: String(title),
      body: String(body),
      url: link ? String(link) : '/',
      image: image ? String(image) : undefined,
    })

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: subs, error: readErr } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
    if (readErr) {
      console.error('send-push: could not read subscriptions', readErr.message)
      return res.status(500).json({ error: 'Could not read subscribers' })
    }

    const total = subs?.length ?? 0
    const stale: number[] = []
    let sent = 0

    await Promise.all(
      (subs ?? []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          )
          sent++
        } catch (err: any) {
          const status = err?.statusCode
          if (status === 404 || status === 410) {
            stale.push(s.id)
          } else {
            console.error('send-push: delivery failed', status, err?.body)
          }
        }
      }),
    )

    if (stale.length) {
      await admin.from('push_subscriptions').delete().in('id', stale)
    }

    return res.status(200).json({ sent, pruned: stale.length, total })
  } catch (err) {
    console.error('send-push: unhandled error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected server error' })
  }
}
