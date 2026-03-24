'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function CheckEmailContent() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('checking')
  const [message, setMessage] = useState('Checking email confirmation...')

  useEffect(() => {
    const checkConfirmation = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setStatus('confirmed')
        setMessage('Email confirmed! Redirecting to dashboard...')
        
        // Determine role from metadata first, then DB
        let role = session.user.user_metadata?.role || 'patient'
        try {
          const { data: userExt } = await supabase
            .from('users_extended')
            .select('role')
            .eq('id', session.user.id)
            .single()
          if (userExt?.role) role = userExt.role
        } catch (_) {}

        setTimeout(() => {
          if (role === 'doctor') router.push('/doctor-dashboard')
          else if (role === 'admin') router.push('/admin-dashboard')
          else router.push('/patient-dashboard')
        }, 2000)
      } else {
        setStatus('pending')
        setMessage('Waiting for email confirmation. Check your inbox for a confirmation link.')
      }
    }

    checkConfirmation()

    // Poll for confirmation every 3 seconds
    const interval = setInterval(checkConfirmation, 3000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200 text-center">
        <div className="mb-6">
          {status === 'checking' && (
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          )}
          {status === 'confirmed' && (
            <div className="text-6xl">✓</div>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-4 text-gray-900">
          {status === 'checking' && 'Verifying Email'}
          {status === 'confirmed' && 'Email Confirmed!'}
          {status === 'pending' && 'Check Your Email'}
        </h1>

        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {status === 'pending' && (
          <div className="bg-blue-50 border border-blue-300 text-blue-700 p-4 rounded-lg text-sm">
            <p className="mb-2">📧 Didn&apos;t receive the email?</p>
            <p>Check your spam folder or try registering again with a different email.</p>
          </div>
        )}
      </div>
    </div>
  )
}

