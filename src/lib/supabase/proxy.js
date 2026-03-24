/**
 * Supabase Session Proxy (Middleware Helper)
 * 
 * Handles automatic token refresh and session persistence across requests.
 * Called from middleware to keep auth tokens fresh.
 * 
 * IMPORTANT: In server route handlers, ALWAYS use getUser() not getSession()
 * getSession() is unsafe and doesn't revalidate tokens.
 * getUser() makes a request to auth server every time, so it's safe.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client that can modify cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies (for subsequent middleware/server components)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // Create a new response to set cookies on the client
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the auth session
  // This will update the session cookie with a fresh token if expired
  // IMPORTANT: Use getUser() for security as it validates the token with Supabase
  await supabase.auth.getUser()

  return response
}

