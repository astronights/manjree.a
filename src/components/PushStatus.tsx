import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  isSubscribed,
  pushConfigured,
  pushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push'
import type { PushPermission } from '../lib/push'

// Show only on the customer catalog — admin and product pages have their own
// fixed bottom bars so we stay out of the way there.
function useShowBar() {
  const { pathname } = useLocation()
  return !pathname.startsWith('/admin') && !pathname.startsWith('/product/')
}

export default function PushStatus() {
  const show = useShowBar()
  const [permission, setPermission] = useState<PushPermission>('unsupported')
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pushConfigured()) return
    setPermission(pushPermission())
    isSubscribed().then((sub) => {
      setSubscribed(sub)
      // If permission already granted but SW was reset, silently re-subscribe.
      if (!sub && pushPermission() === 'granted') {
        subscribeToPush().then((ok) => { if (ok) setSubscribed(true) }).catch(() => {})
      }
    })
  }, [])

  // Clear the confirm-timeout when unmounting.
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }, [])

  if (!pushConfigured() || !show || permission === 'unsupported') return null

  const handleEnable = async () => {
    if (!confirming) {
      // First tap: prime the confirm. Auto-reset after 4 s if they walk away.
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirming(false)
    setBusy(true)
    try {
      const ok = await subscribeToPush()
      setPermission(ok ? 'granted' : Notification.permission as PushPermission)
      setSubscribed(ok)
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } finally {
      setBusy(false)
    }
  }

  const base = 'fixed inset-x-0 bottom-0 z-10 border-t px-4 py-2'

  if (permission === 'denied') {
    return (
      <div className={`${base} border-cream-200 bg-cream-50 dark:border-night-800 dark:bg-night-900`}>
        <p className="mx-auto max-w-5xl text-center text-xs text-night-700/55 dark:text-cream-300/45">
          🔕 Notifications are blocked — allow them in your browser settings to get updates
        </p>
      </div>
    )
  }

  if (permission === 'granted' && subscribed) {
    return (
      <div className={`${base} border-cream-200 bg-cream-50 dark:border-night-800 dark:bg-night-900`}>
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-3">
          <p className="text-xs text-night-700/65 dark:text-cream-300/50">🔔 Notifications on</p>
          <button
            onClick={handleDisable}
            disabled={busy}
            className="text-xs text-night-700/45 underline underline-offset-2 hover:text-night-700 disabled:opacity-40 dark:text-cream-300/35 dark:hover:text-cream-300"
          >
            {busy ? '…' : 'Turn off'}
          </button>
        </div>
      </div>
    )
  }

  // Not yet subscribed (permission 'default' or 'granted' but no subscription).
  return (
    <div className={`${base} border-marigold-300/60 bg-marigold-50 dark:border-night-700 dark:bg-night-900`}>
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3">
        <p className="text-xs text-marigold-700 dark:text-marigold-400">
          {confirming ? 'Tap again to confirm' : '🔔 Get notified about new arrivals & sales'}
        </p>
        <button
          onClick={handleEnable}
          disabled={busy || subscribed === null}
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold transition disabled:opacity-50 ${
            confirming
              ? 'bg-night-800 text-cream-100 dark:bg-marigold-400 dark:text-night-900'
              : 'bg-marigold-400 text-night-900 hover:bg-marigold-300'
          }`}
        >
          {busy ? '…' : confirming ? 'Confirm' : 'Enable'}
        </button>
      </div>
    </div>
  )
}
