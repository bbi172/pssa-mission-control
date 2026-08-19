import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// detectSessionInUrl is turned OFF deliberately — Supabase's automatic
// handling of invite-link tokens wasn't working reliably, and appeared to
// be consuming the token before our own manual parsing (in
// app/set-password/page.tsx) could read it. Turning this off means only
// our own code ever touches the URL token, avoiding that race entirely.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: false,
  },
})