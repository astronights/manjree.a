// Vercel serverless function: proxies "Suggest with AI" requests to Gemini so
// GEMINI_API_KEY stays server-side (set it in Vercel → Settings → Environment
// Variables; it is NOT a VITE_ variable and never reaches the browser).
//
// Deliberately does not import from src/ — the frontend config reads
// import.meta.env, which doesn't exist in the function runtime.

const MODEL = 'gemini-2.5-flash'
const CATEGORIES = ['Kurti', 'Suit Set', 'Saree', 'Dupatta', 'Other']

function buildPrompt(hints: { title?: string; description?: string }): string {
  return [
    "You write product listings for a small Indian women's ethnic wear boutique.",
    'Look at the photo and reply with JSON only: {"title": string, "description": string, "category": string}.',
    'title: elegant, specific, max 50 characters (garment type + fabric/colour/detail). No quotes or emoji.',
    'description: 2-3 warm, concrete sentences (fabric, work/detailing, occasion). No hashtags.',
    `category: exactly one of ${JSON.stringify(CATEGORIES)}.`,
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
  const { image, title, description } = req.body ?? {}
  if (!image?.data || !image?.mimeType) {
    return res.status(400).json({ error: 'A photo is required' })
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
              { inline_data: { mime_type: image.mimeType, data: image.data } },
              { text: buildPrompt({ title, description }) },
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
      category: CATEGORIES.includes(out.category) ? out.category : undefined,
    })
  } catch {
    console.error('generate: unparseable Gemini response', JSON.stringify(json).slice(0, 500))
    return res.status(502).json({ error: 'Could not parse the AI response — try again' })
  }
}
