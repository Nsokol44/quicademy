import { createClient } from '@supabase/supabase-js'

let client = null

/** Server-only. Bypasses RLS — only ever used from the cron-triggered reminders route,
 *  never from a request handler that serves a browser session. Returns null if the
 *  service role key isn't configured. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } })
  }
  return client
}
