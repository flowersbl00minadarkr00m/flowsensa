/**
 * Supabase client for Flowsensa browser app.
 * Uses the anon (publishable) key — safe to ship to the browser.
 * RLS policies restrict this to read-only on telemetry_events.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://snoouuphzmmbvtobxhaw.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gxnw83ffk_c6evmAqS7FEg_8WhxdRXX'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
