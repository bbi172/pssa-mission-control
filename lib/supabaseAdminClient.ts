import { createClient } from '@supabase/supabase-js'

// DANGER: this uses the SECRET service_role key, which bypasses every
// security rule (RLS) we set up. This file must NEVER be imported into
// any 'use client' component — it should only ever run on the server,
// inside files under app/api/.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
