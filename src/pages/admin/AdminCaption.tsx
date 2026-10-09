import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { productRef } from '../../config'
import { listProducts } from '../../lib/store'
import { getSettings } from '../../lib/settings'
import type { ShopSettings } from '../../lib/settings'
import { matchesQuery } from '../../lib/filters'
import { coverMedia, isVideo } from '../../lib/media'
import { suggestCaptions } from '../../lib/ai'
import {
  CAPTION_MAX_CHARS,
  CAPTION_MAX_HASHTAGS,
  assembleCaption,
  countHashtags,
  mergeHashtags,
  normalizeHashtag,
} from '../../lib/caption'
import type { Product } from '../../types'

// Instagram caption maker. Either a catalog piece or photos picked from the
// phone (never both). Nothing on this page is saved: uploads stay in the
// browser (object URLs) and are sent to the AI only as downscaled inline
// images; the caption goes to the clipboard / share sheet.

type Source = 'piece' | 'upload'

interface Media {
  url: string // http(s) for catalog pieces, blob: for uploads
  video: boolean
  file?: File // uploads only
}

const MAX_MEDIA = 10 // Instagram carousel limit
const AI_MEDIA = 4

const EMOJIS = ['', '✨', '🌸', '💫', '🌺', '🌼', '🪷', '💖', '🩷', '🤍', '💛', '🌿', '🎀', '💐', '🪔', '🌙', '⭐', '🧵', '👗', '💕']

function fileName(url: string, i: number, video: boolean): string {
  const last = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '')
  return /\.\w+$/.test(last) ? last : `manjrees-${i + 1}.${video ? 'mp4' : 'jpg'}`
}

async function urlToFile(url: string, i: number, video: boolean): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load media (HTTP ${res.status})`)
  const blob = await res.blob()
  return new File([blob], fileName(url, i, video), { type: blob.type || (video ? 'video/mp4' : 'image/jpeg') })
}

export default function AdminCaption() {
  const [params] = useSearchParams()
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const [source, setSource] = useState<Source>('piece')
  const [query, setQuery] = useState('')
  const [piece, setPiece] = useState<Product | null>(null)
  const [uploads, setUploads] = useState<Media[]>([])
  const [selected, setSelected] = useState<string[]>([]) // media urls, in order

  const [notes, setNotes] = useState('')
  const [captions, setCaptions] = useState<string[]>([])
  const [choice, setChoice] = useState(0)
  const [aiTags, setAiTags] = useState<string[]>([])
  const [extraTags, setExtraTags] = useState<string[]>([])
  const [removedTags, setRemovedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [sizes, setSizes] = useState<string[]>([])
  const [madeToOrder, setMadeToOrder] = useState(false)
  const [includeRef, setIncludeRef] = useState(true)
  const [emoji, setEmoji] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  // Files for the share sheet, prepared ahead of the tap: iOS only opens the
  // share sheet straight from a user gesture, so we can't fetch on tap.
  const [shareFiles, setShareFiles] = useState<File[] | null>(null)
  const uploadsRef = useRef<Media[]>([])
  uploadsRef.current = uploads

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setEmoji(s.caption.emoji)
    })
    listProducts({ includeDrafts: true }).then((all) => {
      setProducts(all)
      const id = params.get('piece')
      const match = id ? all.find((p) => p.id === id) : undefined
      if (match) pickPiece(match)
    })
    // Release the in-memory uploads when leaving the page.
    return () => uploadsRef.current.forEach((m) => URL.revokeObjectURL(m.url))
  }, [])

  const media: Media[] = useMemo(
    () => (source === 'piece' ? (piece?.images ?? []).map((url) => ({ url, video: isVideo(url) })) : uploads),
    [source, piece, uploads],
  )
  const chosen = useMemo(
    () => selected.map((url) => media.find((m) => m.url === url)).filter((m): m is Media => Boolean(m)),
    [selected, media],
  )

  useEffect(() => {
    setShareFiles(null)
    if (!chosen.length) return
    let cancelled = false
    Promise.all(chosen.map((m, i) => m.file ?? urlToFile(m.url, i, m.video)))
      .then((files) => !cancelled && setShareFiles(files))
      .catch(() => !cancelled && setShareFiles([]))
    return () => {
      cancelled = true
    }
  }, [chosen])

  const resetOutput = () => {
    setCaptions([])
    setChoice(0)
    setAiTags([])
    setExtraTags([])
    setRemovedTags([])
    setError(null)
    setStatus(null)
  }

  function pickPiece(p: Product) {
    setPiece(p)
    setSelected(p.images.slice(0, MAX_MEDIA))
    setSizes(p.sizes)
    setMadeToOrder(p.stock_status === 'on_order')
    setIncludeRef(true)
    resetOutput()
  }

  const switchSource = (next: Source) => {
    if (next === source) return
    uploads.forEach((m) => URL.revokeObjectURL(m.url))
    setUploads([])
    setPiece(null)
    setSelected([])
    setSizes([])
    setMadeToOrder(false)
    setSource(next)
    resetOutput()
  }

  const addUploads = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])].slice(0, MAX_MEDIA - uploads.length)
    e.target.value = ''
    const added = files.map((file) => ({
      url: URL.createObjectURL(file),
      video: file.type.startsWith('video/'),
      file,
    }))
    setUploads([...uploads, ...added])
    setSelected([...selected, ...added.map((m) => m.url)])
  }

  const removeUpload = (url: string) => {
    URL.revokeObjectURL(url)
    setUploads(uploads.filter((m) => m.url !== url))
    setSelected(selected.filter((u) => u !== url))
  }

  const toggleMedia = (url: string) => {
    if (selected.includes(url)) setSelected(selected.filter((u) => u !== url))
    else if (selected.length < MAX_MEDIA) setSelected([...selected, url])
  }

  const generate = async () => {
    if (!chosen.length) return setError('Choose at least one photo first.')
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const out = await suggestCaptions(
        chosen,
        notes,
        piece && source === 'piece'
          ? { title: piece.title, description: piece.description, category: piece.category, collection: piece.collection }
          : undefined,
      )
      setCaptions(out.captions)
      setChoice(0)
      setAiTags(out.hashtags)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const hashtags = useMemo(() => {
    const removed = new Set(removedTags.map((t) => t.toLowerCase()))
    return mergeHashtags(settings?.caption.hashtags ?? [], aiTags, extraTags).filter(
      (t) => !removed.has(t.toLowerCase()),
    )
  }, [settings, aiTags, extraTags, removedTags])

  const addTag = () => {
    const tag = normalizeHashtag(tagInput)
    setTagInput('')
    if (!tag) return
    setRemovedTags(removedTags.filter((t) => t.toLowerCase() !== tag.toLowerCase()))
    setExtraTags([...extraTags, tag])
  }

  const sizeOptions = useMemo(() => {
    const base = settings?.sizes ?? []
    return [...base, ...(piece?.sizes ?? []).filter((s) => !base.includes(s))]
  }, [settings, piece])

  const finalText = settings
    ? assembleCaption({
        caption: captions[choice] ?? '',
        sizes: sizeOptions.filter((s) => sizes.includes(s)),
        madeToOrder,
        madeToOrderLine: settings.caption.made_to_order_line,
        ref: source === 'piece' && piece && includeRef ? productRef(piece.id) : null,
        emoji,
        contactLine: settings.caption.contact_line,
        hashtags,
      })
    : ''
  const charCount = [...finalText].length
  const tagCount = countHashtags(finalText)

  const copy = async () => {
    setError(null)
    try {
      await navigator.clipboard.writeText(finalText)
      setStatus('✓ Caption copied')
    } catch {
      setError('Could not copy — select the preview text and copy it by hand.')
    }
  }

  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    Boolean(shareFiles?.length) &&
    (navigator.canShare?.({ files: shareFiles! }) ?? false)

  const share = async () => {
    if (!shareFiles?.length) return
    setError(null)
    // Start both inside the tap: the clipboard write and the share sheet each
    // need the user gesture. Instagram ignores shared text, hence the copy.
    const copied = navigator.clipboard?.writeText(finalText).then(
      () => true,
      () => false,
    )
    try {
      await navigator.share({ files: shareFiles })
      setStatus((await copied) ? '✓ Caption copied — paste it in Instagram' : 'Shared — use Copy for the caption')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus((await copied) ? '✓ Caption copied' : null)
        return
      }
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!settings) {
    return <p className="p-8 text-center text-base text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  const inputClass =
    'mt-1 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-base text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100'
  const labelClass = 'text-base font-medium text-night-800 dark:text-cream-100'
  const chip = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
      on
        ? 'bg-night-800 text-cream-100 dark:bg-marigold-400 dark:text-night-900'
        : 'bg-cream-200 text-night-700 hover:bg-cream-300 dark:bg-night-800 dark:text-cream-200 dark:hover:bg-night-700'
    }`
  const toggleRow = (on: boolean, set: (v: boolean) => void, title: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream-50 p-3 ring-1 ring-cream-300/60 dark:bg-night-800 dark:ring-night-700">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-1 h-4 w-4 accent-marigold-500" />
      <span>
        <span className="block font-medium text-night-800 dark:text-cream-100">{title}</span>
        <span className="block text-sm text-night-700/80 dark:text-cream-300/60">{hint}</span>
      </span>
    </label>
  )
  const results = products.filter((p) => matchesQuery(p, query)).slice(0, 30)

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-base text-night-700/85 hover:underline dark:text-cream-300/70">
        ← Catalog
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        Instagram caption
      </h1>
      <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
        Pick a piece or some photos, get caption ideas, then copy or share to Instagram. Nothing
        here is saved.
      </p>

      {/* 1. Source */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(
          [
            ['piece', 'From a piece'],
            ['upload', 'Upload photos'],
          ] as [Source, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => switchSource(value)}
            className={`rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition ${
              source === value
                ? 'border-marigold-500 bg-marigold-400 text-night-900'
                : 'border-cream-300 bg-cream-50 text-night-800 hover:bg-cream-200 dark:border-night-700 dark:bg-night-800 dark:text-cream-100 dark:hover:bg-night-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {source === 'piece' && !piece && (
        <div className="mt-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your pieces…"
            className={inputClass}
          />
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {results.map((p) => {
              const cover = coverMedia(p.images)
              return (
                <li key={p.id}>
                  <button onClick={() => pickPiece(p)} className="block w-full text-left">
                    {cover && isVideo(cover) ? (
                      <video src={cover} muted playsInline preload="metadata" className="aspect-[4/5] w-full rounded-lg object-cover" />
                    ) : (
                      <img src={cover} alt="" className="aspect-[4/5] w-full rounded-lg bg-cream-200 object-cover dark:bg-night-700" />
                    )}
                    <span className="mt-1 line-clamp-2 text-xs text-night-700 dark:text-cream-200">
                      {p.is_draft ? 'Draft · ' : ''}
                      {p.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {results.length === 0 && (
            <p className="py-6 text-center text-sm text-night-700/80 dark:text-cream-300/60">No pieces match.</p>
          )}
        </div>
      )}

      {source === 'piece' && piece && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cream-50 p-3 ring-1 ring-cream-300/60 dark:bg-night-800 dark:ring-night-700">
          <div className="min-w-0">
            <p className="truncate font-display font-semibold text-night-800 dark:text-cream-100">{piece.title}</p>
            <p className="text-sm text-night-700/80 dark:text-cream-300/60">Ref: {productRef(piece.id)}</p>
          </div>
          <button
            onClick={() => {
              setPiece(null)
              setSelected([])
              resetOutput()
            }}
            className="shrink-0 text-sm font-medium text-leaf-500 hover:underline"
          >
            Change
          </button>
        </div>
      )}

      {(source === 'upload' || piece) && (
        <div className="mt-4">
          <p className={labelClass}>
            Photos{' '}
            <span className="font-normal text-night-700/70 dark:text-cream-300/60">
              ({selected.length} selected · the AI looks at the first {AI_MEDIA})
            </span>
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {media.map((m) => {
              const n = selected.indexOf(m.url)
              return (
                <div key={m.url} className="relative">
                  <button
                    onClick={() => toggleMedia(m.url)}
                    aria-pressed={n >= 0}
                    aria-label={n >= 0 ? `Photo ${n + 1} — tap to remove` : 'Tap to use this photo'}
                    className={`block aspect-[4/5] w-full overflow-hidden rounded-lg border-2 transition ${
                      n >= 0 ? 'border-marigold-500' : 'border-transparent opacity-50'
                    }`}
                  >
                    {m.video ? (
                      <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                  {n >= 0 && (
                    <span className="pointer-events-none absolute left-1 top-1 rounded bg-marigold-400 px-1.5 text-xs font-semibold text-night-900">
                      {n + 1}
                    </span>
                  )}
                  {source === 'upload' && (
                    <button
                      onClick={() => removeUpload(m.url)}
                      aria-label="Remove"
                      className="absolute right-1 top-1 rounded-full bg-night-900/70 px-1.5 py-0.5 text-xs text-cream-100"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
            {source === 'upload' && uploads.length < MAX_MEDIA && (
              <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-cream-300 text-night-700/80 transition hover:border-marigold-400 dark:border-night-700 dark:text-cream-300/60">
                <span className="text-2xl">+</span>
                <span className="px-1 text-center text-xs">Add photos</span>
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={addUploads} />
              </label>
            )}
          </div>
          {source === 'upload' && (
            <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
              These stay on your phone — they’re not added to the shop.
            </p>
          )}
        </div>
      )}

      {/* 2. Notes + generate */}
      {chosen.length > 0 && (
        <>
          <div className="mt-4">
            <label className={labelClass}>
              Notes <span className="font-normal text-night-700/70 dark:text-cream-300/60">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. pure cotton, Diwali, hand block print"
              className={inputClass}
            />
          </div>
          <button
            onClick={generate}
            disabled={busy}
            className="mt-3 w-full rounded-xl border border-marigold-400/70 bg-marigold-50 py-2.5 text-base font-medium text-marigold-700 transition hover:bg-marigold-100 disabled:opacity-50 dark:border-marigold-600 dark:bg-night-800 dark:text-marigold-300"
          >
            {busy ? 'Writing captions…' : captions.length ? '↻ Regenerate captions' : '✨ Generate captions'}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-base text-bougainvillea-500">{error}</p>}

      {/* 3. Pick + finish */}
      {captions.length > 0 && (
        <div className="mt-6 space-y-5">
          <div>
            <p className={labelClass}>Choose a caption</p>
            <div className="mt-2 space-y-2">
              {captions.map((c, i) =>
                i === choice ? (
                  <textarea
                    key={i}
                    value={c}
                    onChange={(e) => setCaptions(captions.map((x, j) => (j === i ? e.target.value : x)))}
                    rows={8}
                    aria-label={`Caption option ${i + 1} (selected, editable)`}
                    className="w-full rounded-xl border-2 border-marigold-500 bg-cream-50 px-3 py-2.5 text-base text-night-800 outline-none dark:bg-night-800 dark:text-cream-100"
                  />
                ) : (
                  <button
                    key={i}
                    onClick={() => setChoice(i)}
                    className="block w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-left text-sm text-night-700 transition hover:bg-cream-200 dark:border-night-700 dark:bg-night-800 dark:text-cream-200"
                  >
                    <span className="line-clamp-3 whitespace-pre-line">{c}</span>
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <p className={labelClass}>Sizes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizeOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSizes(sizes.includes(s) ? sizes.filter((x) => x !== s) : [...sizes, s])}
                  aria-pressed={sizes.includes(s)}
                  className={chip(sizes.includes(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {toggleRow(madeToOrder, setMadeToOrder, 'Made to order', settings.caption.made_to_order_line)}
            {source === 'piece' &&
              piece &&
              toggleRow(includeRef, setIncludeRef, 'Ref code', `Adds “Ref: ${productRef(piece.id)}” so DMs can be matched`)}
          </div>

          <div>
            <p className={labelClass}>Contact line emoji</p>
            <button
              onClick={() => setEmojiOpen(!emojiOpen)}
              className="mt-2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-night-800 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
            >
              {emoji || 'None'} · {settings.caption.contact_line}
            </button>
            {emojiOpen && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e || 'none'}
                    onClick={() => {
                      setEmoji(e)
                      setEmojiOpen(false)
                    }}
                    aria-label={e || 'No emoji'}
                    className={`h-10 min-w-10 rounded-lg px-2 text-lg ${
                      emoji === e ? 'bg-marigold-400' : 'bg-cream-200 dark:bg-night-800'
                    }`}
                  >
                    {e || <span className="text-xs">None</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className={labelClass}>Hashtags</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hashtags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-cream-200 py-1 pl-3 pr-1.5 text-sm text-night-700 dark:bg-night-800 dark:text-cream-200"
                >
                  {t}
                  <button
                    onClick={() => setRemovedTags([...removedTags, t])}
                    aria-label={`Remove ${t}`}
                    className="rounded-full px-1 text-night-700/70 hover:bg-cream-300 dark:text-cream-300/60 dark:hover:bg-night-700"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add a hashtag"
                className={`${inputClass} mt-0`}
              />
              <button
                onClick={addTag}
                className="shrink-0 rounded-xl border border-cream-300 bg-cream-50 px-4 font-medium text-night-800 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
              >
                Add
              </button>
            </div>
          </div>

          {/* 4. Preview + output */}
          <div>
            <p className="text-sm font-medium text-night-700/80 dark:text-cream-300/60">Preview</p>
            <div className="mt-2 whitespace-pre-wrap break-words rounded-2xl bg-cream-50 p-3 text-sm text-night-800 ring-1 ring-cream-300/60 dark:bg-night-800 dark:text-cream-100 dark:ring-night-700">
              {finalText}
            </div>
            <p
              className={`mt-1 text-right text-xs ${
                charCount > CAPTION_MAX_CHARS || tagCount > CAPTION_MAX_HASHTAGS
                  ? 'font-semibold text-bougainvillea-500'
                  : 'text-night-700/70 dark:text-cream-300/60'
              }`}
            >
              {charCount}/{CAPTION_MAX_CHARS} characters · {tagCount}/{CAPTION_MAX_HASHTAGS} hashtags
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex-1 rounded-xl border border-cream-300 bg-cream-50 py-3 font-medium text-night-800 transition hover:bg-cream-200 dark:border-night-700 dark:bg-night-800 dark:text-cream-100 dark:hover:bg-night-700"
            >
              Copy caption
            </button>
            {canShare && (
              <button
                onClick={share}
                className="flex-1 rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300"
              >
                Share to Instagram
              </button>
            )}
          </div>
          {status && <p className="text-base font-medium text-leaf-500">{status}</p>}
        </div>
      )}
    </main>
  )
}
