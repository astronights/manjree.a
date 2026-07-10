import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { defaultCategories, defaultNewArrivalDays, defaultSizes, getSettings, saveSettings } from '../../lib/settings'
import { signOut } from '../../lib/store'

// One entry per line; commas also accepted.
function parseList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function AdminSettings() {
  const navigate = useNavigate()
  const [categoriesText, setCategoriesText] = useState<string | null>(null)
  const [sizesText, setSizesText] = useState('')
  const [daysText, setDaysText] = useState(String(defaultNewArrivalDays))
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSettings().then((s) => {
      setCategoriesText(s.categories.join('\n'))
      setSizesText(s.sizes.join(', '))
      setDaysText(String(s.new_arrival_days))
    })
  }, [])

  if (categoriesText === null) {
    return <p className="p-8 text-center text-base text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const clean = await saveSettings({
        categories: parseList(categoriesText),
        sizes: parseList(sizesText),
        new_arrival_days: Number(daysText),
      })
      setCategoriesText(clean.categories.join('\n'))
      setSizesText(clean.sizes.join(', '))
      setDaysText(String(clean.new_arrival_days))
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
    setDaysText(String(defaultNewArrivalDays))
    setSaved(false)
  }

  const areaClass =
    'mt-1.5 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100'

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-base text-night-700/85 hover:underline dark:text-cream-300/70">
        ← Catalog
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        Shop settings
      </h1>

      <div className="mt-5 space-y-5">
        <div>
          <label className="block text-base font-medium text-night-800 dark:text-cream-100">
            Categories
          </label>
          <textarea
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            rows={9}
            className={areaClass}
          />
          <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
            One per line, in the order they should appear as filters. Pieces already saved under a
            removed category keep it until edited.
          </p>
        </div>

        <div>
          <label className="block text-base font-medium text-night-800 dark:text-cream-100">Sizes</label>
          <textarea
            value={sizesText}
            onChange={(e) => setSizesText(e.target.value)}
            rows={2}
            className={areaClass}
          />
          <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
            Comma-separated, in display order.
          </p>
        </div>

        <div>
          <label className="block text-base font-medium text-night-800 dark:text-cream-100">
            "New" badge duration (days)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={daysText}
            onChange={(e) => setDaysText(e.target.value)}
            className={areaClass}
          />
          <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
            How long a piece stays in New Arrivals after being marked new (1–60 days).
          </p>
        </div>

        {error && <p className="text-base text-bougainvillea-500">{error}</p>}
        {saved && <p className="text-base font-medium text-leaf-500">✓ Saved</p>}

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

        <button
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
          className="mx-auto block pt-4 text-sm text-night-700/70 underline dark:text-cream-300/60"
        >
          Lock admin panel
        </button>
      </div>
    </main>
  )
}
