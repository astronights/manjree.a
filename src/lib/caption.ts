// Instagram caption helper (admin → Caption): turns the AI's caption plus the
// admin's picks (sizes, made-to-order, ref code, contact line, hashtags) into
// the final text she pastes into Instagram. Nothing here is persisted — only
// the reusable defaults below live in shop settings.

export interface CaptionDefaults {
  contact_line: string
  emoji: string
  hashtags: string[]
  made_to_order_line: string
}

export const defaultCaptionDefaults: CaptionDefaults = {
  contact_line: 'Feel free to message me for pricing and more details',
  emoji: '✨',
  hashtags: [],
  made_to_order_line: 'Made to order — DM to place yours',
}

// Instagram's own limits.
export const CAPTION_MAX_CHARS = 2200
export const CAPTION_MAX_HASHTAGS = 30

// "#Red Kurti!" → "#redkurti"-ish: one leading #, no spaces or punctuation
// (Instagram ends a tag at the first non-word character).
export function normalizeHashtag(raw: string): string | null {
  const body = raw.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')
  return body ? `#${body}` : null
}

// Normalise, then drop case-insensitive duplicates, keeping the first spelling.
export function mergeHashtags(...lists: string[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of lists.flat()) {
    const clean = normalizeHashtag(tag)
    if (!clean || seen.has(clean.toLowerCase())) continue
    seen.add(clean.toLowerCase())
    out.push(clean)
  }
  return out
}

export function sanitizeCaptionDefaults(value: unknown): CaptionDefaults {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof CaptionDefaults, unknown>>
  const text = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback)
  return {
    contact_line: text(raw.contact_line, defaultCaptionDefaults.contact_line),
    // The emoji may be deliberately blank (no emoji around the contact line).
    emoji: typeof raw.emoji === 'string' ? raw.emoji.trim() : defaultCaptionDefaults.emoji,
    hashtags: Array.isArray(raw.hashtags) ? mergeHashtags(raw.hashtags.map(String)) : [],
    made_to_order_line: text(raw.made_to_order_line, defaultCaptionDefaults.made_to_order_line),
  }
}

export interface CaptionParts {
  caption: string
  sizes: string[]
  madeToOrder: boolean
  madeToOrderLine: string
  ref: string | null
  emoji: string
  contactLine: string
  hashtags: string[]
}

// caption → sizes / made to order / ref / contact line → hashtags, with
// switched-off or empty parts dropped.
export function assembleCaption(p: CaptionParts): string {
  const details = [
    p.sizes.length ? `Sizes Available: ${p.sizes.join(' | ')}` : '',
    p.madeToOrder ? p.madeToOrderLine.trim() : '',
    p.ref ? `Ref: ${p.ref}` : '',
    p.contactLine.trim() ? [p.emoji, p.contactLine.trim(), p.emoji].filter(Boolean).join(' ') : '',
  ].filter(Boolean)
  return [p.caption.trim(), details.join('\n'), p.hashtags.join(' ')].filter(Boolean).join('\n\n')
}

export function countHashtags(text: string): number {
  return text.match(/(^|\s)#[\p{L}\p{N}_]+/gu)?.length ?? 0
}
