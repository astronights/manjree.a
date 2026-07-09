import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { shop } from '../../config'
import { isSupabaseMode, signIn } from '../../lib/store'
import { projectRef } from '../../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn({ passcode })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-center font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        {shop.name} Admin
      </h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-center text-lg tracking-widest text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100"
        />
        {!isSupabaseMode && (
          <p className="text-center text-sm text-night-700/80 dark:text-cream-300/60">
            Demo mode — the passcode is 1234 (set VITE_DEMO_ADMIN_PIN to change it).
          </p>
        )}
        {error && <p className="text-center text-base text-bougainvillea-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
        >
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-night-700/70 dark:text-cream-300/50">
        {isSupabaseMode ? `Supabase project: ${projectRef}` : 'Local demo mode — no backend connected'}
      </p>
    </main>
  )
}
