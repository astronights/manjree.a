// Vercel serverless function: stores a customer's Web Push subscription.
// Open to anyone (customers never log in) — it only ever writes an opaque
// browser push endpoint, keyed by the anonymous device id. Uses the service
// role to bypass RLS so the endpoint's unique-conflict upsert works.
//
// Deliberately does not import from src/ — the frontend reads import.meta.env,
// which doesn't exist in the function runtime.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' })
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      console.error('subscribe: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
      return res.status(500).json({ error: 'Push is not configured on the server' })
    }

    const { deviceId, endpoint, keys } = req.body ?? {}
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'A push subscription is required' })
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        device_id: deviceId ?? null,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' },
    )
    if (error) {
      console.error('subscribe: upsert failed', error.message)
      return res.status(500).json({ error: 'Could not save your subscription' })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('subscribe: unhandled error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected server error' })
  }
}
