// Checks a passcode against Supabase Auth exactly the way the app does,
// but prints the real underlying response — useful when /admin says
// "Incorrect passcode" and you want to know precisely why.
//
//   npm run admin:verify -- <passcode>
//
// Uses only the public (anon/publishable) key, same as the frontend.
import { explainMissing, loadDotEnv } from './env.mjs'

const envInfo = loadDotEnv()

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.VITE_ADMIN_EMAIL || 'admin@manjrees.local'
const passcode = process.argv[2]

if (!url || !anonKey) {
  console.error(explainMissing(!url ? 'VITE_SUPABASE_URL' : 'VITE_SUPABASE_ANON_KEY', envInfo))
  process.exit(1)
}
if (!passcode) {
  console.error('Usage: npm run admin:verify -- <passcode>')
  process.exit(1)
}

console.log(`Signing in as ${email} …`)
const res = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anonKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: passcode }),
})
const json = await res.json().catch(() => ({}))

if (res.ok && json.access_token) {
  console.log('✓ Passcode is correct — this exact value unlocks /admin.')
  process.exit(0)
}

console.error(`✗ Sign-in failed (HTTP ${res.status})`)
console.error(`  ${json.error_description || json.msg || json.message || JSON.stringify(json)}`)
if (json.error_code === 'invalid_credentials' || res.status === 400) {
  console.error(
    '\nThe stored passcode differs from what you typed. Reset it with:\n' +
      '  npm run admin:create -- <new-passcode>\n' +
      'Use only letters and digits to avoid shell quoting surprises, and pass\n' +
      'it without quotes.',
  )
} else if (res.status === 429) {
  console.error('\nToo many attempts — Supabase is rate-limiting. Wait a few minutes and retry.')
}
process.exit(1)
