// Creates (or resets the passcode of) the single admin account.
//
//   npm run admin:create -- <passcode>
//
// The admin signs in with just this passcode; under the hood it is the
// Supabase Auth password of a fixed account (VITE_ADMIN_EMAIL, defaulting to
// admin@manjrees.local — never receives mail). Requires VITE_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in .env. Run again with a new passcode to rotate.
//
// Talks to the Supabase Auth admin REST API directly with fetch, so it runs
// on any Node >= 18 (supabase-js requires Node 22+ for its WebSocket dep).
import { explainMissing, loadDotEnv } from './env.mjs'

const envInfo = loadDotEnv()

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.VITE_ADMIN_EMAIL || 'admin@manjrees.local'
const passcode = process.argv[2]

if (!url || !serviceKey) {
  console.error(explainMissing(!url ? 'VITE_SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY', envInfo))
  process.exit(1)
}
if (!passcode || passcode.length < 6) {
  console.error('Usage: npm run admin:create -- <passcode>   (at least 6 characters)')
  process.exit(1)
}

const base = `${url.replace(/\/+$/, '')}/auth/v1/admin`
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
}

async function api(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

const authError = (json) => json.msg || json.message || json.error_description || json.error || 'unknown error'

const created = await api('POST', '/users', { email, password: passcode, email_confirm: true })
if (created.ok) {
  console.log(`Admin account ${email} created. Sign in at /admin with the passcode.`)
  process.exit(0)
}

// Already exists → treat as a passcode rotation.
const list = await api('GET', '/users?page=1&per_page=1000')
const existing = list.ok ? (list.json.users ?? []).find((u) => u.email === email) : undefined
if (!existing) {
  console.error(`Could not create admin (HTTP ${created.status}): ${authError(created.json)}`)
  process.exit(1)
}

const updated = await api('PUT', `/users/${existing.id}`, { password: passcode })
if (!updated.ok) {
  console.error(`Could not update passcode (HTTP ${updated.status}): ${authError(updated.json)}`)
  process.exit(1)
}
console.log(`Passcode updated for ${email}. Sign in at /admin with the new passcode.`)
