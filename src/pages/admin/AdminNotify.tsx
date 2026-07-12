import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isNew, isSupabaseMode, listProducts } from '../../lib/store'
import { onSale } from '../../lib/pricing'
import { supabase } from '../../lib/supabase'
import { coverMedia } from '../../lib/media'
import { notifyDefaults } from '../../lib/notify'
import type { NotifyType } from '../../lib/notify'
import type { Product } from '../../types'

const TYPES: { value: NotifyType; label: string; hint: string }[] = [
  { value: 'new', label: 'New additions', hint: 'Latest pieces just added' },
  { value: 'sale', label: 'New sale pieces', hint: 'Fresh markdowns' },
  { value: 'collection', label: 'A collection', hint: 'New in a named collection' },
]

// A push image must be a public URL the recipient's browser can fetch. Demo
// mode uses data URLs (and has no server), so only http(s) covers qualify.
function httpCover(images: string[]): string | undefined {
  const cover = coverMedia(images)
  return cover && /^https?:\/\//.test(cover) ? cover : undefined
}

export default function AdminNotify() {
  const [type, setType] = useState<NotifyType>('new')
  const [collection, setCollection] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [touched, setTouched] = useState(false)
  const [image, setImage] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [subscribers, setSubscribers] = useState<number | null>(null)

  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; pruned: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load products (for the image picker + collection list) and the live
  // subscriber count.
  useEffect(() => {
    listProducts({ includeDrafts: false }).then((all) => {
      setProducts(all)
      setCollections([...new Set(all.map((p) => p.collection).filter((c): c is string => Boolean(c)))])
    })
    if (supabase) {
      supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .then(({ count }) => setSubscribers(count ?? 0))
    }
  }, [])

  const defaults = useMemo(() => notifyDefaults(type, collection), [type, collection])

  // Keep the copy in sync with the chosen preset until the admin hand-edits it.
  useEffect(() => {
    if (touched) return
    setTitle(defaults.title)
    setBody(defaults.body)
  }, [defaults, touched])

  // The photo picker shows pieces relevant to the chosen update — sale pieces
  // for a sale, new arrivals for "new", the chosen collection's pieces for a
  // collection — so the obvious ones are right there. products come newest
  // first (listProducts sorts by created_at desc), so this stays newest-first.
  // If nothing matches (e.g. no new arrivals yet) we fall back to all pieces
  // rather than leave the picker empty.
  const covers = useMemo(() => {
    const match = (p: Product) => {
      if (type === 'sale') return onSale(p)
      if (type === 'new') return isNew(p)
      return collection ? p.collection === collection : true
    }
    const relevant = products.filter(match)
    const source = relevant.length ? relevant : products
    return source
      .map((p) => ({ id: p.id, title: p.title, url: httpCover(p.images) }))
      .filter((c) => c.url)
  }, [products, type, collection])

  const canSend = Boolean(title.trim() && body.trim()) && (subscribers ?? 0) > 0 && !sending

  const send = async () => {
    if (!supabase) return
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Your admin session expired — sign in again.')

      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: defaults.url,
          image: image ?? undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Send failed (HTTP ${res.status})`)
      setResult(json)
      setConfirming(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-base text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100'

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-base text-night-700/85 hover:underline dark:text-cream-300/70">
        ← Catalog
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        Send a notification
      </h1>
      <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
        Push a message to everyone who opted in. It shows on their phone even when the shop isn’t
        open in a tab. Tapping it opens the matching pieces.
      </p>

      {!isSupabaseMode ? (
        <p className="mt-5 rounded-2xl bg-marigold-100 px-4 py-3 text-sm font-medium text-marigold-700 dark:bg-night-800 dark:text-marigold-300">
          Notifications need the live shop (Supabase). This demo has no subscribers to send to.
        </p>
      ) : (
        <>
          {/* What kind of update */}
          <div className="mt-5">
            <label className="text-base font-medium text-night-800 dark:text-cream-100">What’s the update?</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setType(t.value)
                    setTouched(false)
                    setResult(null)
                    setImage(null)
                  }}
                  className={`rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition ${
                    type === t.value
                      ? 'border-marigold-500 bg-marigold-400 text-night-900'
                      : 'border-cream-300 bg-cream-50 text-night-800 hover:bg-cream-200 dark:border-night-700 dark:bg-night-800 dark:text-cream-100 dark:hover:bg-night-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'collection' && (
            <div className="mt-4">
              <label className="text-base font-medium text-night-800 dark:text-cream-100">Which collection?</label>
              {collections.length > 0 ? (
                <select
                  value={collection}
                  onChange={(e) => {
                    setCollection(e.target.value)
                    setTouched(false)
                    setImage(null)
                  }}
                  className={inputClass}
                >
                  <option value="">Choose a collection…</option>
                  {collections.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm text-night-700/70 dark:text-cream-300/60">
                  No collections yet — add one to a piece first.
                </p>
              )}
            </div>
          )}

          {/* Copy */}
          <div className="mt-4">
            <label className="text-base font-medium text-night-800 dark:text-cream-100">Title</label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTouched(true)
              }}
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div className="mt-4">
            <label className="text-base font-medium text-night-800 dark:text-cream-100">Message</label>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                setTouched(true)
              }}
              rows={2}
              maxLength={160}
              className={inputClass}
            />
          </div>

          {/* Optional image */}
          <div className="mt-4">
            <label className="text-base font-medium text-night-800 dark:text-cream-100">
              Show a piece <span className="font-normal text-night-700/70 dark:text-cream-300/60">(optional)</span>
            </label>
            {covers.length > 0 ? (
              <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
                <button
                  onClick={() => setImage(null)}
                  className={`flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border text-xs ${
                    image === null
                      ? 'border-marigold-500 bg-marigold-100 font-semibold text-marigold-700 dark:bg-night-700'
                      : 'border-cream-300 text-night-700/70 dark:border-night-700 dark:text-cream-300/60'
                  }`}
                >
                  None
                </button>
                {covers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setImage(c.url!)}
                    aria-label={`Use photo of ${c.title}`}
                    className={`h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      image === c.url ? 'border-marigold-500' : 'border-transparent'
                    }`}
                  >
                    <img src={c.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-night-700/70 dark:text-cream-300/60">
                No photos available to attach.
              </p>
            )}
          </div>

          {/* Live preview */}
          <div className="mt-6">
            <p className="text-sm font-medium text-night-700/80 dark:text-cream-300/60">Preview</p>
            <div className="mt-2 flex gap-3 rounded-2xl bg-cream-50 p-3 shadow-sm ring-1 ring-cream-300/60 dark:bg-night-800 dark:ring-night-700">
              <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-night-800 dark:text-cream-100">
                  {title || 'Notification title'}
                </p>
                <p className="text-sm text-night-700/85 dark:text-cream-300/70">{body || 'Your message…'}</p>
                <p className="mt-0.5 truncate text-xs text-night-700/60 dark:text-cream-300/50">manjrees · opens {defaults.url}</p>
              </div>
              {image && <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
            </div>
          </div>

          {/* Send with an inline (not a dialog) two-step confirm */}
          <div className="mt-6">
            <p className="text-sm text-night-700/80 dark:text-cream-300/60">
              {subscribers === null
                ? 'Counting subscribers…'
                : subscribers === 0
                  ? 'No one has opted in yet — nothing to send.'
                  : `${subscribers} ${subscribers === 1 ? 'person is' : 'people are'} subscribed.`}
            </p>

            {!confirming ? (
              <button
                onClick={() => {
                  setError(null)
                  setResult(null)
                  setConfirming(true)
                }}
                disabled={!canSend}
                className="mt-2 w-full rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
              >
                Review &amp; send
              </button>
            ) : (
              <div className="mt-2 rounded-xl border border-marigold-400 bg-marigold-100 p-3 dark:border-marigold-500/60 dark:bg-night-800">
                <p className="text-sm font-medium text-marigold-700 dark:text-marigold-300">
                  Send this to {subscribers} {subscribers === 1 ? 'person' : 'people'} now? This can’t be undone.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={send}
                    disabled={sending}
                    className="flex-1 rounded-xl bg-bougainvillea-500 py-2.5 font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Yes, send now'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={sending}
                    className="rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 font-medium text-night-800 transition hover:bg-cream-200 disabled:opacity-50 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-base text-bougainvillea-500">{error}</p>}
            {result && (
              <p className="mt-3 text-base font-medium text-leaf-500">
                ✓ Sent to {result.sent} of {result.total}
                {result.pruned > 0 && ` (${result.pruned} expired and were removed)`}.
              </p>
            )}
          </div>
        </>
      )}
    </main>
  )
}
