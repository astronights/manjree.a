import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import {
  isSubscribed,
  pushConfigured,
  pushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push'
import type { PushPermission } from '../lib/push'

type Theme = 'light' | 'dark' | 'system'

const THEME_OPTIONS: [Theme, string][] = [
  ['system', 'Auto'],
  ['light', 'Light'],
  ['dark', 'Dark'],
]

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: Theme
  options: [Theme, string][]
  onChange: (v: Theme) => void
}) {
  return (
    <div className="flex rounded-lg bg-cream-200 p-0.5 dark:bg-night-800">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
            value === v
              ? 'bg-white text-night-800 shadow-sm dark:bg-night-700 dark:text-cream-100'
              : 'text-night-700/60 hover:text-night-700 dark:text-cream-300/50 dark:hover:text-cream-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin text-night-700/40 dark:text-cream-300/40"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function Toggle({
  checked,
  onChange,
  disabled,
  busy,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none ${
        disabled ? 'opacity-35' : ''
      } ${checked ? 'bg-marigold-400' : 'bg-cream-300 dark:bg-night-700'}`}
    >
      <span
        className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      >
        {busy && <Spinner />}
      </span>
    </button>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onGetApp?: () => void
}

export default function SettingsSheet({ open, onClose, onGetApp }: Props) {
  const { theme, setMode } = useTheme()

  const [permission, setPermission] = useState<PushPermission>('unsupported')
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setSubscribed(null) // reset while we re-check
    if (!pushConfigured()) return
    setPermission(pushPermission())
    isSubscribed().then(setSubscribed).catch(() => setSubscribed(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleToggleNotifications = async (want: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (want) {
        const ok = await subscribeToPush()
        setPermission(pushPermission())
        setSubscribed(ok)
      } else {
        await unsubscribeFromPush()
        setSubscribed(false)
      }
    } finally {
      setBusy(false)
    }
  }

  const pushAvailable = pushConfigured() && permission !== 'unsupported'
  const pushDenied = permission === 'denied'

  let notifSubtitle = ''
  if (pushDenied) notifSubtitle = 'Blocked in browser settings'
  else if (subscribed === null) notifSubtitle = 'Checking…'
  else if (subscribed) notifSubtitle = "You'll get alerts for new arrivals & sales"
  else notifSubtitle = 'Stay in the loop for new arrivals & sales'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-night-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Preferences"
        className={`fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-cream-50 shadow-2xl transition-transform duration-300 ease-out dark:bg-night-900 dark:border-t dark:border-night-700 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-night-700/20 dark:bg-cream-300/20" />
        </div>

        <div className="px-5 pb-safe-bottom pb-8">
          <h2 className="pb-4 pt-2 text-base font-semibold text-night-800 dark:text-cream-100">
            Preferences
          </h2>

          {/* Appearance */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 text-night-700 dark:bg-night-800 dark:text-cream-300">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
                </svg>
              </span>
              <span className="text-sm font-medium text-night-800 dark:text-cream-100">Appearance</span>
            </div>
            <SegmentedControl value={theme} options={THEME_OPTIONS} onChange={setMode} />
          </div>

          {pushAvailable && (
            <>
              <div className="border-t border-cream-200 dark:border-night-700" />

              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 text-night-700 dark:bg-night-800 dark:text-cream-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <p className="text-sm font-medium text-night-800 dark:text-cream-100">Notifications</p>
                    <p className={`truncate text-xs ${pushDenied ? 'text-bougainvillea-500' : 'text-night-700/60 dark:text-cream-300/50'}`}>
                      {notifSubtitle}
                    </p>
                  </span>
                </div>
                {subscribed === null && !pushDenied ? (
                  <div className="flex h-7 w-12 shrink-0 items-center justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <Toggle
                    checked={Boolean(subscribed)}
                    onChange={handleToggleNotifications}
                    disabled={pushDenied}
                    busy={busy}
                  />
                )}
              </div>
            </>
          )}

          {onGetApp && (
            <>
              <div className="border-t border-cream-200 dark:border-night-700" />
              <button
                onClick={() => { onClose(); onGetApp() }}
                className="flex w-full items-center justify-between gap-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 text-night-700 dark:bg-night-800 dark:text-cream-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-night-800 dark:text-cream-100">Get the App</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-night-700/40 dark:text-cream-300/40">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
