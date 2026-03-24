'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in, silently redirect (non-blocking — form shows immediately)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || 'patient'
        if (userRole === 'admin') router.replace('/admin-dashboard')
        else if (userRole === 'doctor') router.replace('/doctor-dashboard')
        else router.replace('/patient-dashboard')
      }
    }).catch(() => {})
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const signStart = Date.now()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      const signElapsed = Date.now() - signStart
      console.debug(`[Login] signInWithPassword elapsed: ${signElapsed}ms`)

      if (signInError) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      const userRole = data.user?.user_metadata?.role || 'patient'

      // Admin: enforce single admin rule
      if (userRole === 'admin') {
        try {
          const res = await fetch('/api/admin/exists')
          const payload = await res.json()
          const existingAdmin = payload?.data || null
          if (existingAdmin && existingAdmin.id !== data.user?.id) {
            await supabase.auth.signOut()
            setError('Another administrator account is active. Contact the current admin for access.')
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('[Login] admin check error:', err)
        }
      }

      setSuccess('✓ Login successful! Redirecting...')

      // Redirect based on role or ?next= param
      const params = new URLSearchParams(window.location.search)
      const next = params.get('next')
      if (next && !next.startsWith('/login') && !next.startsWith('/register')) {
        router.replace(next)
      } else if (userRole === 'admin') {
        router.replace('/admin-dashboard')
      } else if (userRole === 'doctor') {
        router.replace('/doctor-dashboard')
      } else {
        router.replace('/patient-dashboard')
      }
    } catch (err) {
      // Ignore aborts caused by navigation/unmounts or controller aborts
      if (err?.name === 'AbortError' || String(err).toLowerCase().includes('signal is aborted')) {
        console.info('[Login] request aborted, ignoring')
        setLoading(false)
        return
      }

      console.error('[Login] Error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 py-6 relative"
      style={{ backgroundImage: "url('/Screenshot%202026-02-07%20192826.png')" }}
    >
      <div className="absolute inset-0 bg-slate/20 pointer-events-none"></div>
      <div className="w-full max-w-md bg-linear-to-br from-teal-500/50 to-blue-900/30 p-8 rounded-2xl shadow-lg border border-gray-200 backdrop-blur-sm relative z-10">
        <div className="mb-4">
          <button onClick={() => router.push('/')} className="text-teal-600 font-semibold hover:text-teal-700">
            ← Home
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-linear-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl">♥</span>
          </div>
          <h1 className="text-3xl font-semibold mb-2 text-white-600">Welcome to MediBook</h1>
          <p className="text-gray-700 text-sm">Sign in to continue</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-300 text-green-800 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="@gmail.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-linear-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-7 text-center text-gray-900 text-md">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-white hover:text-white font-semibold">
            Sign up here
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-gray-600">
          
        </p>
      </div>
    </div>
  )
}

