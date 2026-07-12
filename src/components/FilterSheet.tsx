import type { CatalogFilters, SortOrder } from '../lib/filters'
import type { StockStatus } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  filters: CatalogFilters
  onChange: (patch: Partial<CatalogFilters>) => void
  sizes: string[]
  mine: { hasSeen: boolean; hasSaved: boolean; hasEnquired: boolean }
}

const AVAILABILITY: [StockStatus | null, string][] = [
  [null, 'Any'],
  ['in_stock', 'In stock'],
  ['on_order', 'On order'],
]

export const SORT_LABELS: [SortOrder, string][] = [
  ['featured', 'Recommended'],
  ['newest', 'Newest first'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
]

export default function FilterSheet({ open, onClose, filters, onChange, sizes, mine }: Props) {
  if (!open) return null

  const chip = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-base transition ${
      active
        ? 'border-marigold-500 bg-marigold-400 font-semibold text-night-900'
        : 'border-cream-300 bg-cream-100 text-night-700 dark:border-night-600 dark:bg-night-900 dark:text-cream-200'
    }`

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Filters">
      <button aria-label="Close filters" className="absolute inset-0 bg-night-900/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-cream-50 p-5 pb-8 dark:bg-night-800">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-300 dark:bg-night-600" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-night-800 dark:text-cream-100">Filters</h2>
          <button
            onClick={() => onChange({ sizes: [], availability: null, sort: 'featured', hideSeen: false, hideSaved: false, hideEnquired: false })}
            className="text-sm text-night-700/80 underline dark:text-cream-300/70"
          >
            Clear all
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-medium text-night-800 dark:text-cream-100">Sort by</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SORT_LABELS.map(([value, label]) => (
              <button key={value} onClick={() => onChange({ sort: value })} className={chip(filters.sort === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-base font-medium text-night-800 dark:text-cream-100">Size</h3>
          <p className="text-sm text-night-700/80 dark:text-cream-300/60">
            Free-size pieces (sarees, dupattas) always show.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() =>
                  onChange({
                    sizes: filters.sizes.includes(s)
                      ? filters.sizes.filter((x) => x !== s)
                      : [...filters.sizes, s],
                  })
                }
                className={`min-w-12 ${chip(filters.sizes.includes(s))}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-base font-medium text-night-800 dark:text-cream-100">Availability</h3>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {AVAILABILITY.map(([value, label]) => (
              <button
                key={label}
                onClick={() => onChange({ availability: value })}
                className={chip(filters.availability === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(mine.hasSeen || mine.hasSaved || mine.hasEnquired) && (
          <div className="mt-5">
            <h3 className="text-base font-medium text-night-800 dark:text-cream-100">My activity</h3>
            <div className="mt-2 flex flex-col gap-2">
              {mine.hasSeen && (
                <button
                  onClick={() => onChange({ hideSeen: !filters.hideSeen })}
                  className={chip(filters.hideSeen)}
                >
                  Hide pieces I've seen
                </button>
              )}
              {mine.hasSaved && (
                <button
                  onClick={() => onChange({ hideSaved: !filters.hideSaved })}
                  className={chip(filters.hideSaved)}
                >
                  ♥ Hide saved/pinned by me
                </button>
              )}
              {mine.hasEnquired && (
                <button
                  onClick={() => onChange({ hideEnquired: !filters.hideEnquired })}
                  className={chip(filters.hideEnquired)}
                >
                  ✓ Hide enquired by me
                </button>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300"
        >
          Done
        </button>
      </div>
    </div>
  )
}
