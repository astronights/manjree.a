import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProduct, listProducts, newUntilFromNow, saveProduct, uploadMedia } from '../../lib/store'
import { getSettings } from '../../lib/settings'
import type { ShopSettings } from '../../lib/settings'
import { suggestDetails } from '../../lib/ai'
import { coverMedia, isVideo } from '../../lib/media'
import type { Product } from '../../types'

// While editing, price is the raw input string; converted on save.
type ProductForm = Omit<Product, 'id' | 'created_at' | 'price'> & {
  id?: string
  created_at?: string
  price: number | string
}

const blank: ProductForm = {
  title: '',
  description: '',
  price: '',
  category: '',
  sizes: [],
  images: [],
  is_new_arrival: true,
  new_until: null,
  in_stock: true,
  is_draft: false,
  pinned: false,
  show_price: true,
  collection: null,
}

export default function AdminProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductForm | null>(id ? null : blank)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collections, setCollections] = useState<string[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)

  useEffect(() => {
    if (id) getProduct(id).then(setForm)
    getSettings().then((s) => {
      setSettings(s)
      // New pieces default to the first configured category.
      if (!id) setForm((f) => (f && !f.category ? { ...f, category: s.categories[0] } : f))
    })
    listProducts({ includeDrafts: true }).then((all) =>
      setCollections([...new Set(all.map((p) => p.collection).filter((c): c is string => Boolean(c)))]),
    )
  }, [id])

  if (!form || !settings) {
    return <p className="p-8 text-center text-sm text-night-700/60 dark:text-cream-300/60">Loading…</p>
  }

  // Keep values from before a settings edit selectable (e.g. a piece saved
  // under a category that was later renamed/removed).
  const categoryOptions =
    form.category && !settings.categories.includes(form.category)
      ? [form.category, ...settings.categories]
      : settings.categories
  const sizeOptions = [...settings.sizes, ...form.sizes.filter((s) => !settings.sizes.includes(s))]

  const set = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f!, ...patch }))

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      const urls = await uploadMedia(files)
      set({ images: [...form.images, ...urls] })
    } catch (err) {
      setError(`Photo upload failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const removePhoto = (i: number) => set({ images: form.images.filter((_, j) => j !== i) })

  const movePhoto = (i: number, dir: -1 | 1) => {
    const imgs = [...form.images]
    const j = i + dir
    if (j < 0 || j >= imgs.length) return
    ;[imgs[i], imgs[j]] = [imgs[j], imgs[i]]
    set({ images: imgs })
  }

  const toggleSize = (s: string) =>
    set({ sizes: form.sizes.includes(s) ? form.sizes.filter((x) => x !== s) : [...form.sizes, s] })

  const suggest = async () => {
    const photo = coverMedia(form.images.filter((m) => !isVideo(m)))
    if (!photo) return setError('Add at least one photo first — the AI looks at the cover photo.')
    setAiBusy(true)
    setError(null)
    try {
      const s = await suggestDetails(
        photo,
        { title: form.title, description: form.description },
        settings.categories,
      )
      set({
        title: s.title || form.title,
        description: s.description || form.description,
        ...(s.category && settings.categories.includes(s.category) ? { category: s.category } : {}),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAiBusy(false)
    }
  }

  const save = async (asDraft: boolean) => {
    if (!form.title.trim()) return setError('A title is required.')
    if (!asDraft && form.images.length === 0) {
      return setError('Add at least one photo or video before publishing.')
    }
    if (!asDraft && !(Number(form.price) > 0)) return setError('Set a price before publishing.')
    setBusy(true)
    setError(null)
    try {
      await saveProduct({
        ...form,
        price: Number(form.price) || 0,
        is_draft: asDraft,
        // Stamp the auto-expiry whenever the piece is (still) marked new.
        new_until: form.is_new_arrival ? form.new_until ?? newUntilFromNow() : null,
      })
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const toggles: ['is_new_arrival' | 'in_stock' | 'pinned' | 'show_price', string, string][] = [
    ['is_new_arrival', 'Mark as New Arrival', 'Shows a "New" badge and features it on top (auto-expires)'],
    ['in_stock', 'In stock', 'Turn off to show "Sold out"'],
    ['show_price', 'Show price', 'Turn off to show "Price on request" instead'],
    ['pinned', 'Pin to top', 'Keeps this piece first in the catalog'],
  ]

  const inputClass =
    'w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100'
  const labelClass = 'block text-sm font-medium text-night-800 dark:text-cream-100'

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-sm text-night-700/70 hover:underline dark:text-cream-300/70">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        {id ? 'Edit piece' : 'Add new piece'}
      </h1>

      <div className="mt-5 space-y-5">
        <div>
          <label className={labelClass}>Photos</label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {form.images.map((src, i) => (
              <div key={i} className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-cream-200 dark:bg-night-700">
                {isVideo(src) ? (
                  <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={src} alt="" className="h-full w-full object-cover" />
                )}
                {isVideo(src) && (
                  <span className="absolute right-1 top-1 rounded bg-night-900/70 px-1.5 text-[10px] font-medium text-cream-100">
                    ▶ Video
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-night-900/60 py-1 text-cream-100">
                  <button onClick={() => movePhoto(i, -1)} aria-label="Move left" className="px-1.5">‹</button>
                  <button onClick={() => removePhoto(i)} aria-label="Remove photo" className="px-1.5">✕</button>
                  <button onClick={() => movePhoto(i, 1)} aria-label="Move right" className="px-1.5">›</button>
                </div>
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-marigold-400 px-1.5 text-[10px] font-semibold text-night-900">
                    Cover
                  </span>
                )}
              </div>
            ))}
            <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-cream-300 text-night-700/60 transition hover:border-marigold-400 dark:border-night-700 dark:text-cream-300/60">
              <span className="text-2xl">+</span>
              <span className="px-1 text-center text-xs">Add photos / videos</span>
              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={addPhotos} />
            </label>
          </div>
          <p className="mt-1 text-xs text-night-700/60 dark:text-cream-300/60">
            Select several at once (front, back, fabric close-up, a short video). The first item is
            the cover — photos make the best covers.
          </p>
        </div>

        <button
          type="button"
          onClick={suggest}
          disabled={aiBusy || busy}
          className="w-full rounded-xl border border-marigold-400/70 bg-marigold-50 py-2.5 text-sm font-medium text-marigold-700 transition hover:bg-marigold-100 disabled:opacity-50 dark:border-marigold-600 dark:bg-night-800 dark:text-marigold-300"
        >
          {aiBusy ? 'Looking at the photo…' : '✨ Suggest title & description from photo'}
        </button>

        <div>
          <label className={labelClass}>Title</label>
          <input
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Marigold Anarkali Kurti"
            className={`mt-1.5 ${inputClass}`}
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={4}
            placeholder="Fabric, fit, occasion…"
            className={`mt-1.5 ${inputClass}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Price (₹)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => set({ price: e.target.value })}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.category}
              onChange={(e) => set({ category: e.target.value })}
              className={`mt-1.5 ${inputClass}`}
            >
              {categoryOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Available sizes</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={`min-w-11 rounded-lg border px-3 py-1.5 text-sm transition ${
                  form.sizes.includes(s)
                    ? 'border-marigold-500 bg-marigold-400 font-semibold text-night-900'
                    : 'border-cream-300 bg-cream-50 text-night-700 dark:border-night-700 dark:bg-night-800 dark:text-cream-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-night-700/60 dark:text-cream-300/60">
            Leave all unselected for free-size pieces (sarees, dupattas).
          </p>
        </div>

        <div>
          <label className={labelClass}>Collection (optional)</label>
          <input
            list="collection-options"
            value={form.collection ?? ''}
            onChange={(e) => set({ collection: e.target.value || null })}
            placeholder='e.g. "Diwali 2026" — pick one or type a new name'
            className={`mt-1.5 ${inputClass}`}
          />
          <datalist id="collection-options">
            {collections.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-night-700/60 dark:text-cream-300/60">
            Pieces sharing a collection get a festive filter chip on the home page.
          </p>
        </div>

        <div className="space-y-2.5 rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700">
          {toggles.map(([key, label, hint]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-night-800 dark:text-cream-100">{label}</span>
                <span className="block text-xs text-night-700/60 dark:text-cream-300/60">{hint}</span>
              </span>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) =>
                  set(
                    key === 'is_new_arrival'
                      ? { is_new_arrival: e.target.checked, new_until: e.target.checked ? newUntilFromNow() : null }
                      : { [key]: e.target.checked },
                  )
                }
                className="h-5 w-5 accent-marigold-500"
              />
            </label>
          ))}
        </div>

        {error && <p className="text-sm text-bougainvillea-500">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => save(true)}
            disabled={busy}
            className="flex-1 rounded-xl border border-cream-300 bg-cream-50 py-3 font-medium text-night-800 transition hover:bg-cream-200 disabled:opacity-50 dark:border-night-700 dark:bg-night-800 dark:text-cream-100 dark:hover:bg-night-700"
          >
            Save as draft
          </button>
          <button
            onClick={() => save(false)}
            disabled={busy}
            className="flex-1 rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </div>
    </main>
  )
}
