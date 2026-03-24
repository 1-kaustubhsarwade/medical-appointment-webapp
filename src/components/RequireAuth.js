"use client"

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const redirectTimer = useRef()

  useEffect(() => {
    // Determine if this navigation was a reload
    let navType = null
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation')
      navType = navEntries && navEntries[0] && navEntries[0].type
    } catch (e) {
      navType = null
    }

    // If still loading, wait. On reload we allow a short grace period
    if (loading) return

    // If page was reloaded, wait briefly for AuthProvider to restore session
    const isReload = navType === 'reload' || navType === 'navigate' && performance?.navigation?.type === 1

    const doRedirect = () => {
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`)
        return
      }
      // Admin users may not have a users_extended profile — skip profile check for admin
      const userRole = user.user_metadata?.role
      if (userRole === 'admin') return
      if (user && !profile) {
        router.replace('/register')
        return
      }
    }

    if (isReload && !user) {
      // Give the auth flow a short window (1.5s) to rehydrate on refresh
      redirectTimer.current = setTimeout(() => {
        doRedirect()
      }, 1500)
    } else {
      doRedirect()
    }

    return () => clearTimeout(redirectTimer.current)
  }, [user, profile, loading, router, pathname])

  // While resolving, show a lightweight spinner
  // Admin can proceed without a profile
  const userRole = user?.user_metadata?.role
  const isReady = !loading && user && (userRole === 'admin' || profile)
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return children
}

