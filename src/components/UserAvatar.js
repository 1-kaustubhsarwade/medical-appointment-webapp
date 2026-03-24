'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { logError } from '@/lib/errorHandler'
import { useRouter } from 'next/navigation'

export default function UserAvatar({ dashboardPath = '/dashboard' }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [open, setOpen] = useState(false)
  const [roleLoaded, setRoleLoaded] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth?.user) return

        // Fetch extended profile (users_extended) for full name only.
        // Role may be stored in JWT user metadata; some DB schemas don't include a `role` column.
        const { data: profileData, error: profileError } = await supabase
          .from('users_extended')
          .select('full_name')
          .eq('id', auth.user.id)
          .single()

        if (profileError) {
          // Don't treat a missing DB column as fatal for the avatar; fall back to metadata
          console.warn('[UserAvatar] profile fetch warning (falling back to metadata):', profileError)
          setName(auth.user.email?.split('@')[0] || 'User')
          const metaRole = auth.user.user_metadata?.role || ''
          setRole(metaRole)
        } else if (profileData) {
          setName(profileData.full_name || auth.user.email?.split('@')[0] || 'User')
          const metaRole = auth.user.user_metadata?.role || ''
          setRole(metaRole)
          console.log('[UserAvatar] Role loaded (from metadata):', metaRole)
        }
      } catch (err) {
        logError('UserAvatar.fetchProfile - unexpected error', err)
        setRole('')
      } finally {
        setRoleLoaded(true)
      }
    }

    fetchUser()
  }, [])

  const logout = async () => {
    setOpen(false)
    try {
      await supabase.auth.signOut()
      // Force instant redirect to login page
      window.location.replace('/login')
    } catch (err) {
      logError('UserAvatar.logout - unexpected error', err)
      // Still redirect even on error to ensure logout UX
      window.location.replace('/login')
    }
  }
  const initial = (name && name.trim().charAt(0) && name.trim().charAt(0).toUpperCase()) || 'U'

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={`User menu for ${name || 'user'}`}
        className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-full hover:bg-white/20 transition"
      >
        {/* Avatar Circle */}
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold uppercase">
          {initial}
        </div>

        {/* Name */}
        <span className="text-white font-medium hidden sm:block">
          {name}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-linear-to-br from-teal-600 to-blue-600 rounded-lg shadow-lg overflow-hidden z-50">
          {roleLoaded && role === 'doctor' && (
            <button
              onClick={() => {
                setOpen(false)
                router.push('/doctor-profile')
              }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition"
            >
              Profile
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false)
              router.push(dashboardPath)
            }}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition"
          >
            Dashboard
          </button>

          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-white/10 transition font-semibold"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

