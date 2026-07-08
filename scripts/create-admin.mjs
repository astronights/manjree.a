// Creates (or resets the passcode of) the single admin account.
//
//   npm run admin:create -- <passcode>
//
// The admin signs in with just this passcode; under the hood it is the
// Supabase Auth password of a fixed account (VITE_ADMIN_EMAIL, defaulting to
// admin@manjrees.local — never receives mail). Requires VITE_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in .env. Run again with a new passcode to rotate.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.VITE_ADMIN_EMAIL || 'admin@manjrees.local'
const passcode = process.argv[2]

if (!url || !serviceKey) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}
if (!passcode || passcode.length < 6) {
  console.error('Usage: npm run admin:create -- <passcode>   (at least 6 characters)')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: created, error } = await admin.auth.admin.createUser({
  email,
  password: passcode,
  email_confirm: true,
})

if (!error) {
  console.log(`Admin account ${created.user.email} created. Sign in at /admin with the passcode.`)
  process.exit(0)
}

// Already exists → treat as a passcode rotation.
const { data: list, error: listError } = await admin.auth.admin.listUsers()
const existing = list?.users.find((u) => u.email === email)
if (listError || !existing) {
  console.error(`Could not create admin: ${error.message}`)
  process.exit(1)
}
const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password: passcode })
if (updateError) {
  console.error(`Could not update passcode: ${updateError.message}`)
  process.exit(1)
}
console.log(`Passcode updated for ${email}. Sign in at /admin with the new passcode.`)
