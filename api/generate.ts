// Vercel serverless function: proxies "Suggest with AI" requests to Gemini so
// GEMINI_API_KEY stays server-side (set it in Vercel → Settings → Environment
// Variables; it is NOT a VITE_ variable and never reaches the browser).
//
// Gated to the admin the same way as send-push: the caller sends their
// Supabase session token and it must resolve to the admin account, so the
// Gemini quota can't be spent by anyone who finds the URL.
//
// Deliberately does not import from src/ — the frontend config reads
// import.meta.env, which doesn't exist in the function runtime.

import { createClient } from '@supabase/supabase-js'

const MODEL = 'gemini-2.5-flash'
const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'admin@manjrees.local'
// Fallback when the client doesn't send its (admin-editable) category list.
const DEFAULT_CATEGORIES = [
  'Kurti',
  'Kurti Pant',
  'Kurti Set',
  'Unstitched Suit Set',
  'Saree',
  'Dupatta',
  'Kaftan Set',
  'Other',
]

function buildPrompt(hints: { title?: string; description?: string }, categories: string[]): string {
  return [
    "You write product listings for a small Indian women's ethnic wear boutique.",
    'Look at the photo and reply with JSON only: {"title": string, "description": string, "category": string}.',
    'title: elegant, specific, max 50 characters (garment type + fabric/colour/detail). No quotes or emoji.',
    'description: 2-3 warm, concrete sentences (fabric, work/detailing, occasion). No hashtags.',
    `category: exactly one of ${JSON.stringify(categories)}.`,
    hints.title ? `The seller's draft title (improve on it): ${hints.title}` : '',
    hints.description ? `The seller's notes (fold them in): ${hints.description}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export default async function handler(req: any, res: any) {
  try {
    return await generate(req, res)
  } catch (err) {
    // Anything unexpected still produces a readable response + a log line.
    console.error('generate: unhandled error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected server error' })
  }
}

async function generate(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    console.error('generate: GEMINI_API_KEY missing — set it in Vercel env vars and redeploy')
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in Vercel' })
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('generate: Supabase env vars missing')
    return res.status(500).json({ error: 'Supabase is not configured on the server' })
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ error: 'Not signed in' })
  }
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data: userData, error: userErr } = await authClient.auth.getUser(token)
  if (userErr || !userData?.user || userData.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Not authorised' })
  }
  const { image, title, description, categories: rawCategories } = req.body ?? {}
  if (!image?.data || !image?.mimeType) {
    return res.status(400).json({ error: 'A photo is required' })
  }
  const categories = Array.isArray(rawCategories)
    ? rawCategories.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 30)
    : []
  const categoryList = categories.length ? categories : DEFAULT_CATEGORIES

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: image.mimeType, data: image.data } },
              { text: buildPrompt({ title, description }, categoryList) },
            ],
          },
        ],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    },
  )
  const json = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    console.error(`generate: Gemini HTTP ${upstream.status}`, JSON.stringify(json).slice(0, 500))
    return res.status(502).json({ error: json.error?.message ?? `Gemini error (HTTP ${upstream.status})` })
  }
  try {
    const out = JSON.parse(json.candidates[0].content.parts[0].text)
    return res.status(200).json({
      title: String(out.title ?? ''),
      description: String(out.description ?? ''),
      category: categoryList.includes(out.category) ? out.category : undefined,
    })
  } catch {
    console.error('generate: unparseable Gemini response', JSON.stringify(json).slice(0, 500))
    return res.status(502).json({ error: 'Could not parse the AI response — try again' })
  }
}
