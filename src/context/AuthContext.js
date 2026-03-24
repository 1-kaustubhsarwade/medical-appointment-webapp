'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { logError } from '@/lib/errorHandler'

const AuthContext = createContext()

/** Returns true when the error is a Supabase navigator.locks abort */
function isAbortError(err) {
  if (!err) return false
  return (
    err?.name === 'AbortError' ||
    String(err?.message).toLowerCase().includes('signal is aborted') ||
    String(err).toLowerCase().includes('signal is aborted')
  )
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()
  // Prevent concurrent checkSession calls – they cause navigator.locks AbortErrors
  const checkingRef = useRef(false)

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      // Guard: skip if another check is already in flight
      if (checkingRef.current) return
      checkingRef.current = true
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          // Fetch user profile
          const { data: profileData, error } = await supabase
            .from('users_extended')
            .select('id, full_name, phone, role, created_at')
            .eq('id', session.user.id)
            .single()

          if (error) {
            // Non-blocking: Log but don't fail - RLS policies might block this
            if (error.code !== 'PGRST116') { // Not "no rows returned"
              logError('Note: Could not load profile (RLS may block anonymous reads)', error)
            }
          } else if (profileData) {
            setProfile(profileData)
          }
        }
      } catch (error) {
        // Silently ignore lock-abort errors – they're harmless and caused by concurrency
        if (!isAbortError(error)) {
          console.error('Session check error:', error)
        }
      } finally {
        setLoading(false)
        checkingRef.current = false
      }
    }

    checkSession()

    // Listen for auth changes (no cross-tab polling or focus handlers)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)

        // Fetch profile when user changes
        try {
          const { data: profileData, error } = await supabase
            .from('users_extended')
            .select('id, full_name, phone, role, created_at')
            .eq('id', session.user.id)
            .single()

          if (error) {
            // Non-blocking: Log but don't fail
            if (error.code !== 'PGRST116') {
              logError('Note: Could not load profile on auth change', error)
            }
          } else if (profileData) {
            setProfile(profileData)
          }
        } catch (err) {
          if (!isAbortError(err)) {
            logError('Note: Could not load profile on auth change', err)
          }
        }
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { data, error } = await supabase
        .from('users_extended')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return { success: true, data }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    updateProfile,
    supabase,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

