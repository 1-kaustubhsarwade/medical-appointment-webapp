import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next.js Proxy (formerly Middleware)
 * 
 * Handles session refreshing for Supabase SSR.
 * In Next.js 16+, 'middleware.js' is renamed to 'proxy.js' 
 * and the exported function is named 'proxy'.
 */
export async function proxy(request) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/* (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

