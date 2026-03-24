import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || null

  if (code) {
    const response = NextResponse.redirect(new URL(next || '/', req.url))
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If no explicit `next`, redirect by role
      if (!next && data?.session?.user) {
        const role = data.session.user.user_metadata?.role || 'patient'
        let dest = '/patient-dashboard'
        if (role === 'admin') dest = '/admin-dashboard'
        else if (role === 'doctor') dest = '/doctor-dashboard'
        return NextResponse.redirect(new URL(dest, req.url))
      }
      return response
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', req.url))
}

