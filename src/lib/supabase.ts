import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Null when Supabase isn't configured — the store falls back to local demo mode.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

// Short project identifier (the <ref> in https://<ref>.supabase.co), shown on
// the admin login page so a deployment pointed at the wrong project is
// obvious. The full URL ships in the JS bundle anyway; this reveals nothing new.
export const projectRef = url ? new URL(url).hostname.split('.')[0] : null
