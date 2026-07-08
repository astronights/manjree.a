import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { shop } from '../../config.js'
import { isSupabaseMode, signIn } from '../../lib/store.js'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(isSupabaseMode ? { email, password } : { pin })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-night-800 outline-none focus:border-marigold-500 dark:border-night-700 dark:bg-night-800 dark:text-cream-100'

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-center font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        {shop.name} Admin
      </h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {isSupabaseMode ? (
          <>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </>
        ) : (
          <>
            <input
              type="password"
              inputMode="numeric"
              required
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={inputClass}
            />
            <p className="text-center text-xs text-night-700/60 dark:text-cream-300/60">
              Demo mode — the PIN is 1234 (set VITE_DEMO_ADMIN_PIN to change it).
            </p>
          </>
        )}
        {error && <p className="text-center text-sm text-bougainvillea-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-marigold-400 py-3 font-semibold text-night-900 transition hover:bg-marigold-300 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
