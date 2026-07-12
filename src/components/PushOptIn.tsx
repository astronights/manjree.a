import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { piecesViewed, pushConfigured, pushPermission, subscribeToPush } from '../lib/push'

const DISMISS_KEY = 'manjrees.pushAsked'

// A gentle one-tap opt-in shown after a customer has browsed ~2 pieces (never
// on first load). Tapping "Notify me" fires the native permission prompt.
export default function PushOptIn() {
  const location = useLocation()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  // If permission was already granted (e.g. after clearing site data wiped the
  // service worker registration), silently re-establish the subscription so the
  // admin's subscriber count stays accurate. No bar needed — we already have consent.
  useEffect(() => {
    if (pushConfigured() && pushPermission() === 'granted') {
      subscribeToPush().catch(() => {})
    }
  }, [])

  useEffect(() => {
    setShow(
      pushConfigured() &&
        pushPermission() === 'default' &&
        piecesViewed() >= 2 &&
        !localStorage.getItem(DISMISS_KEY),
    )
  }, [location])

  if (!show) return null

  const enable = async () => {
    setBusy(true)
    try {
      await subscribeToPush()
    } catch {
      /* declined or failed — either way, don't nag again */
    }
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  return (
    <div className="border-b border-marigold-300/60 bg-marigold-100 px-4 py-2.5 dark:border-night-700 dark:bg-night-800">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <span className="text-lg">🔔</span>
        <p className="flex-1 text-sm text-marigold-700 dark:text-marigold-300">
          Get notified about new arrivals &amp; sales?
        </p>
        <button
          onClick={enable}
          disabled={busy}
          className="shrink-0 rounded-full bg-marigold-400 px-3 py-1.5 text-sm font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
        >
          {busy ? '…' : 'Notify me'}
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-marigold-700 dark:text-marigold-300"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
