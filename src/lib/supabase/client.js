/**
 * Supabase Browser Client
 * 
 * For use in Client Components and browser-side operations.
 * Automatically handles session persistence in localStorage.
 * 
 * Usage:
 *   import { createClient } from '@/lib/supabase/client'
 *   const supabase = createClient()
 *   await supabase.auth.signUp({ email, password })
 */

'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Session-only auth: sessions stored in memory/sessionStorage only.
  // Closing tab = logged out. New tab = new session (no cross-tab sharing).
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        storageKey: 'supabase.auth.token',
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    }
  )
}

/**
 * Get or create singleton Supabase client instance for browser
 * Prevents multiple client instances in same page lifecycle
 */
let singleton

export function getSupabaseClient() {
  if (!singleton) {
    singleton = createClient()
  }
  return singleton
}

