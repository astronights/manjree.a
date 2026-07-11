import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveSettings } from '../../lib/settings'
import type { ShopSettings } from '../../lib/settings'
import { ORDER_STRATEGIES, isStrategy } from '../../lib/ordering'
import type { OrderStrategy } from '../../lib/ordering'
import { listProducts } from '../../lib/store'

type MapKey = 'byHighlight' | 'byCollection' | 'byCategory'

const DESCRIPTIONS = Object.fromEntries(ORDER_STRATEGIES.map((s) => [s.value, s.description]))

export default function AdminOrdering() {
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [collections, setCollections] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSettings().then(setSettings).catch((e) => setError(e.message))
    listProducts({ includeDrafts: true }).then((all) =>
      setCollections([...new Set(all.map((p) => p.collection).filter((c): c is string => Boolean(c)))]),
    )
  }, [])

  if (error) {
    return <p className="p-8 text-center text-base text-bougainvillea-500">Could not load: {error}</p>
  }
  if (!settings) {
    return <p className="p-8 text-center text-base text-night-700/80 dark:text-cream-300/60">Loading…</p>
  }

  const ordering = settings.ordering
  const patchDefault = (v: OrderStrategy) =>
    setSettings((s) => ({ ...s!, ordering: { ...s!.ordering, default: v } }))
  const patchMap = (mapKey: MapKey, key: string, v: OrderStrategy | '') =>
    setSettings((s) => {
      const map = { ...(s!.ordering[mapKey] as Record<string, OrderStrategy>) }
      if (v) map[key] = v
      else delete map[key]
      return { ...s!, ordering: { ...s!.ordering, [mapKey]: map } }
    })

  const save = async () => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const clean = await saveSettings(settings)
      setSettings(clean)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const selectClass =
    'mt-1 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-base text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100'

  // A row whose value is an OrderStrategy (the global default has no "inherit").
  const DefaultRow = () => (
    <div>
      <label className="text-base font-medium text-night-800 dark:text-cream-100">Default order</label>
      <select value={ordering.default} onChange={(e) => patchDefault(e.target.value as OrderStrategy)} className={selectClass}>
        {ORDER_STRATEGIES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">{DESCRIPTIONS[ordering.default]}</p>
    </div>
  )

  // A row that can inherit the default (value '' = "Same as default").
  const OverrideRow = ({ mapKey, name }: { mapKey: MapKey; name: string }) => {
    const current = (ordering[mapKey] as Record<string, OrderStrategy>)[name] ?? ''
    return (
      <div>
        <label className="text-base font-medium text-night-800 dark:text-cream-100">{name}</label>
        <select
          value={current}
          onChange={(e) => patchMap(mapKey, name, e.target.value as OrderStrategy | '')}
          className={selectClass}
        >
          <option value="">Same as default</option>
          {ORDER_STRATEGIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {isStrategy(current) && (
          <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">{DESCRIPTIONS[current]}</p>
        )}
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Link to="/admin" className="mt-3 inline-block text-base text-night-700/85 hover:underline dark:text-cream-300/70">
        ← Catalog
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        Display &amp; ordering
      </h1>
      <p className="mt-1 text-sm text-night-700/80 dark:text-cream-300/60">
        How pieces are arranged on the customer catalog (the “Recommended” order). A more specific
        rule wins: collection → highlight → garment type → default. Sold-out pieces always sink to
        the bottom.
      </p>

      {/* Legend: what each order does */}
      <div className="mt-4 rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-300/50 dark:bg-night-800 dark:ring-night-700">
        <h2 className="text-base font-medium text-night-800 dark:text-cream-100">The order types</h2>
        <dl className="mt-2 space-y-1.5">
          {ORDER_STRATEGIES.map((s) => (
            <div key={s.value} className="text-sm">
              <dt className="inline font-semibold text-night-800 dark:text-cream-100">{s.label}: </dt>
              <dd className="inline text-night-700/85 dark:text-cream-300/70">{s.description}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-5 space-y-5">
        <DefaultRow />

        <section>
          <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">Highlights</h2>
          <div className="mt-2 space-y-4">
            <OverrideRow mapKey="byHighlight" name="new" />
            <OverrideRow mapKey="byHighlight" name="sale" />
          </div>
          <p className="mt-1.5 text-sm text-night-700/60 dark:text-cream-300/50">
            (“new” = New Arrivals, “sale” = On Sale.)
          </p>
        </section>

        {collections.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">Collections</h2>
            <div className="mt-2 space-y-4">
              {collections.map((c) => (
                <OverrideRow key={c} mapKey="byCollection" name={c} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">By garment type</h2>
          <div className="mt-2 space-y-4">
            {settings.categories.map((c) => (
              <OverrideRow key={c} mapKey="byCategory" name={c} />
            ))}
          </div>
        </section>

        {error && <p className="text-base text-bougainvillea-500">{error}</p>}
        {saved && <p className="text-base font-medium text-leaf-500">✓ Saved</p>}

        <button
          onClick={save}
          disabled={busy}
          className="w-full rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save ordering'}
        </button>
      </div>
    </main>
  )
}
