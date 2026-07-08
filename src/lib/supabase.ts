import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Null when Supabase isn't configured — the store falls back to local demo mode.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
