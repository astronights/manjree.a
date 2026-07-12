// Vercel serverless function: removes a push subscription by endpoint.
// Called when a customer opts out from the notification status bar.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return res.status(500).json({ error: 'Not configured' })

    const { endpoint } = req.body ?? {}
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' })

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('unsubscribe: unhandled error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected error' })
  }
}
