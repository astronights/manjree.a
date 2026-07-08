import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { isAdmin } from '../../lib/store.js'

// Wraps admin routes; kicks unauthenticated visitors to the login page.
export default function AdminGuard() {
  const [state, setState] = useState('checking')

  useEffect(() => {
    isAdmin().then((ok) => setState(ok ? 'in' : 'out'))
  }, [])

  if (state === 'checking') {
    return <p className="p-8 text-center text-sm text-night-700/60 dark:text-cream-300/60">Loading…</p>
  }
  return state === 'in' ? <Outlet /> : <Navigate to="/admin/login" replace />
}
