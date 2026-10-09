// Vercel serverless function: Instagram caption options for admin → Caption.
// Takes up to 4 downscaled photos (inline base64 — nothing is uploaded or
// stored anywhere) plus optional piece details / seller notes, and returns
// { captions: string[], hashtags: string[] } from Gemini.
//
// Gated to the admin the same way as send-push: the caller sends their
// Supabase session token and it must resolve to the admin account.
//
// Deliberately does not import from src/ — the frontend reads import.meta.env,
// which doesn't exist in the function runtime.

import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 60 }

const MODEL = 'gemini-2.5-flash'
const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'admin@manjrees.local'
const MAX_IMAGES = 4

interface PieceHints {
  title?: string
  description?: string
  category?: string
  collection?: string
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function buildPrompt(piece: PieceHints, notes: string): string {
  return [
    "You are a social media marketing expert for a small boutique specialising in Indian women's ethnic wear.",
    'Write Instagram captions for the piece shown in the photos (all photos show the same piece).',
    'Reply with JSON only: {"captions": string[], "hashtags": string[]}.',
    'captions: exactly 5 different options. Each has several short paragraphs separated by a blank line:',
    'the first is a captivating one-liner about the piece; the next ones describe it (colour, fabric, work/detailing, fit, occasions).',
    'Keep each caption under 1000 characters. Make some options use tasteful emoji and some use none.',
    'Write the captions to boost engagement and discovery with the Instagram algorithm.',
    'Never mention price, cost, discounts or offers. Do not list sizes, add a contact/DM line or a reference code, and do not put hashtags in the captions — those are added separately.',
    'If you have to use the word kurta, write kurti instead — this is women\'s fashion.',
    'Only describe fabric or work you can actually see or that the seller states.',
    'hashtags: 15-20 specific hashtags (each starting with #) about this piece, Indian ethnic fashion and its occasions. No generic Instagram hashtags like #instagood or #photooftheday.',
    piece.title ? `Piece title: ${piece.title}` : '',
    piece.category ? `Category: ${piece.category}` : '',
    piece.collection ? `Collection: ${piece.collection}` : '',
    piece.description ? `Seller's description: ${piece.description}` : '',
    notes ? `Seller's notes for this post (fold them in): ${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export default async function handler(req: any, res: any) {
  try {
    return await caption(req, res)
  } catch (err) {
    console.error('caption: unhandled error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected server error' })
  }
}

async function caption(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }
  const key = process.env.GEMINI_API_KEY
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!key) {
    console.error('caption: GEMINI_API_KEY missing — set it in Vercel env vars and redeploy')
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in Vercel' })
  }
  if (!url || !anonKey) {
    console.error('caption: Supabase env vars missing')
    return res.status(500).json({ error: 'Supabase is not configured on the server' })
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

  const { images: rawImages, notes, piece } = req.body ?? {}
  const images = (Array.isArray(rawImages) ? rawImages : [])
    .filter((i: any) => typeof i?.data === 'string' && /^image\//.test(String(i?.mimeType)))
    .slice(0, MAX_IMAGES)
  if (!images.length) {
    return res.status(400).json({ error: 'At least one photo is required' })
  }
  const hints: PieceHints = {
    title: clip(piece?.title, 120),
    description: clip(piece?.description, 1500),
    category: clip(piece?.category, 60),
    collection: clip(piece?.collection, 80),
  }

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...images.map((i: any) => ({ inline_data: { mime_type: i.mimeType, data: i.data } })),
              { text: buildPrompt(hints, clip(notes, 1000)) },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: {
            type: 'OBJECT',
            properties: {
              captions: { type: 'ARRAY', items: { type: 'STRING' } },
              hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['captions', 'hashtags'],
          },
        },
      }),
    },
  )
  const json = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    console.error(`caption: Gemini HTTP ${upstream.status}`, JSON.stringify(json).slice(0, 500))
    return res.status(502).json({ error: json.error?.message ?? `Gemini error (HTTP ${upstream.status})` })
  }
  try {
    const out = JSON.parse(json.candidates[0].content.parts[0].text)
    const captions = (Array.isArray(out.captions) ? out.captions : [])
      .map((c: unknown) => String(c).trim())
      .filter(Boolean)
      .slice(0, 5)
    const hashtags = (Array.isArray(out.hashtags) ? out.hashtags : [])
      .map((h: unknown) => String(h).trim())
      .filter(Boolean)
      .slice(0, 30)
    if (!captions.length) throw new Error('no captions')
    return res.status(200).json({ captions, hashtags })
  } catch {
    console.error('caption: unparseable Gemini response', JSON.stringify(json).slice(0, 500))
    return res.status(502).json({ error: 'Could not parse the AI response — try again' })
  }
}
