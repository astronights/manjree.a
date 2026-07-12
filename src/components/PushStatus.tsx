import { useEffect, useState } from 'react'
import {
  isSubscribed,
  pushConfigured,
  pushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push'
import type { PushPermission } from '../lib/push'

export default function PushStatus() {
  const [permission, setPermission] = useState<PushPermission>('unsupported')
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!pushConfigured()) return
    setPermission(pushPermission())
    isSubscribed().then(setSubscribed)
    // If permission is already granted but subscription is gone (e.g. after
    // clearing site data), silently re-subscribe in the background.
    if (pushPermission() === 'granted') {
      isSubscribed().then((sub) => {
        if (!sub) subscribeToPush().then((ok) => setSubscribed(ok)).catch(() => {})
      })
    }
  }, [])

  if (!pushConfigured() || permission === 'unsupported') return null

  const enable = async () => {
    setBusy(true)
    try {
      const ok = await subscribeToPush()
      setPermission(ok ? 'granted' : Notification.permission as PushPermission)
      setSubscribed(ok)
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } finally {
      setBusy(false)
    }
  }

  if (permission === 'denied') {
    return (
      <div className="border-b border-cream-200 bg-cream-50 px-4 py-1.5 dark:border-night-800 dark:bg-night-900">
        <p className="mx-auto max-w-5xl text-center text-xs text-night-700/60 dark:text-cream-300/50">
          🔕 Notifications blocked — enable them in your browser settings to get updates
        </p>
      </div>
    )
  }

  if (permission === 'granted' && subscribed) {
    return (
      <div className="border-b border-cream-200 bg-cream-50 px-4 py-1.5 dark:border-night-800 dark:bg-night-900">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-3">
          <p className="text-xs text-night-700/70 dark:text-cream-300/50">🔔 Notifications on</p>
          <button
            onClick={disable}
            disabled={busy}
            className="text-xs text-night-700/50 underline underline-offset-2 hover:text-night-700 disabled:opacity-50 dark:text-cream-300/40 dark:hover:text-cream-300"
          >
            {busy ? '…' : 'Turn off'}
          </button>
        </div>
      </div>
    )
  }

  // 'default' or granted-but-not-subscribed: show the enable prompt
  return (
    <div className="border-b border-marigold-300/60 bg-marigold-50 px-4 py-1.5 dark:border-night-700 dark:bg-night-900">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3">
        <p className="text-xs text-marigold-700 dark:text-marigold-400">
          🔔 Get notified about new arrivals &amp; sales
        </p>
        <button
          onClick={enable}
          disabled={busy || subscribed === null}
          className="shrink-0 rounded-full bg-marigold-400 px-2.5 py-0.5 text-xs font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
        >
          {busy ? '…' : 'Enable'}
        </button>
      </div>
    </div>
  )
}
