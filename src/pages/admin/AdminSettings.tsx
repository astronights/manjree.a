import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { defaultCategories, defaultSizes, getSettings, saveSettings } from '../../lib/settings'

// One entry per line; commas also accepted.
function parseList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function AdminSettings() {
  const [categoriesText, setCategoriesText] = useState<string | null>(null)
  const [sizesText, setSizesText] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSettings().then((s) => {
      setCategoriesText(s.categories.join('\n'))
      setSizesText(s.sizes.join(', '))
    })
  }, [])

  if (categoriesText === null) {
    return <p className="p-8 text-center text-sm text-night-700/60 dark:text-cream-300/60">Loading…</p>
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const clean = await saveSettings({
        categories: parseList(categoriesText),
        sizes: parseList(sizesText),
      })
      setCategoriesText(clean.categories.join('\n'))
      setSizesText(clean.sizes.join(', '))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const resetDefaults = () => {
    setCategoriesText(defaultCategories.join('\n'))
    setSizesText(defaultSizes.join(', '))
    setSaved(false)
  }

  const areaClass =
    'mt-1.5 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100'

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-sm text-night-700/70 hover:underline dark:text-cream-300/70">
        ← Catalog
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        Shop settings
      </h1>

      <div className="mt-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-night-800 dark:text-cream-100">
            Categories
          </label>
          <textarea
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            rows={9}
            className={areaClass}
          />
          <p className="mt-1 text-xs text-night-700/60 dark:text-cream-300/60">
            One per line, in the order they should appear as filters. Pieces already saved under a
            removed category keep it until edited.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-night-800 dark:text-cream-100">Sizes</label>
          <textarea
            value={sizesText}
            onChange={(e) => setSizesText(e.target.value)}
            rows={2}
            className={areaClass}
          />
          <p className="mt-1 text-xs text-night-700/60 dark:text-cream-300/60">
            Comma-separated, in display order.
          </p>
        </div>

        {error && <p className="text-sm text-bougainvillea-500">{error}</p>}
        {saved && <p className="text-sm font-medium text-leaf-500">✓ Saved</p>}

        <div className="flex gap-3">
          <button
            onClick={resetDefaults}
            disabled={busy}
            className="flex-1 rounded-xl border border-cream-300 bg-cream-50 py-3 font-medium text-night-800 transition hover:bg-cream-200 disabled:opacity-50 dark:border-night-700 dark:bg-night-800 dark:text-cream-100 dark:hover:bg-night-700"
          >
            Reset to defaults
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </main>
  )
}
