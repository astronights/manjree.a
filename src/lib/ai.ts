// "Suggest with AI": sends the cover photo (plus whatever the admin already
// typed, as hints) to /api/generate — a Vercel serverless function that holds
// the Gemini key server-side (see api/generate.ts). The key must never ship
// in this bundle. During `npm run dev` there is no /api runtime, so an
// optional VITE_GEMINI_API_KEY in the local .env enables a direct call for
// testing — that variable must never be set in Vercel.

import { categories } from '../config'

export interface Suggestion {
  title: string
  description: string
  category?: string
}

interface InlineImage {
  data: string // base64, no data: prefix
  mimeType: string
}

export function buildPrompt(hints: { title?: string; description?: string }): string {
  return [
    'You write product listings for a small Indian women\'s ethnic wear boutique.',
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

async function toInlineImage(url: string, maxDim = 768): Promise<InlineImage> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',')
    return { data: url.slice(comma + 1), mimeType: url.slice(5, url.indexOf(';')) }
  }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('Could not load the photo for the AI request'))
    img.src = url
  })
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: 'image/jpeg' }
}

export async function suggestDetails(
  imageUrl: string,
  hints: { title?: string; description?: string },
): Promise<Suggestion> {
  const image = await toInlineImage(imageUrl)

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, ...hints }),
  })
  if (res.ok) return (await res.json()) as Suggestion

  // Local dev fallback: vite has no /api runtime.
  if (import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY) {
    return callGeminiDirect(image, hints)
  }
  const err = (await res.json().catch(() => ({}))) as { error?: string }
  throw new Error(err.error ?? `AI suggestion failed (HTTP ${res.status})`)
}

async function callGeminiDirect(image: InlineImage, hints: { title?: string; description?: string }) {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY as string,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: image.mimeType, data: image.data } },
              { text: buildPrompt(hints) },
            ],
          },
        ],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    },
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Gemini request failed')
  return JSON.parse(json.candidates[0].content.parts[0].text) as Suggestion
}
