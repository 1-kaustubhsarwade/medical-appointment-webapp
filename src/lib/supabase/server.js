/**
 * Supabase Server Client
 * 
 * For use in Server Components, Server Actions, Route Handlers, and middleware.
 * CRITICAL: Always use async/await. Cookies are handled automatically.
 * 
 * Usage in Route Handler:
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('table').select()
 * 
 * Usage in Server Action:
 *   'use server'
 *   const supabase = await createClient()
 *   await supabase.auth.signOut()
 * 
 * IMPORTANT: For protected operations, use supabase.auth.getUser() not getSession()
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called when we need to create or update multiple cookies at the same time.
            // This happens when signing in or out, when the session is refreshed, etc.
            // If you throw an error here, you may have issues with several core features.
            // Not throwing the error might cause unexpected behavior but for some use cases it could be ok.
          }
        },
      },
    }
  )
}

/**
 * Create a service role client for privileged operations
 * ONLY use server-side with SUPABASE_SERVICE_ROLE_KEY
 * NEVER expose service role key to client
 * 
 * Usage:
 *   const adminSupabase = await createAdminClient()
 *   await adminSupabase.from('users').delete().eq('id', userId)
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silent fail for admin operations
          }
        },
      },
    }
  )
}

