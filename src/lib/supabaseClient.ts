import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fails loudly at boot rather than producing confusing runtime errors
  // deep inside a query — every sector depends on this client existing.
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project values.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
})
