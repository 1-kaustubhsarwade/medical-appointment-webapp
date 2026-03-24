'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getErrorMessage, logError } from '@/lib/errorHandler'
import { getSpecializations } from '@/lib/db'
import DEFAULT_SPECIALIZATIONS from '@/lib/specializations'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('patient')
  const [specialization, setSpecialization] = useState('')
  const [specializationsList, setSpecializationsList] = useState(DEFAULT_SPECIALIZATIONS)
  const [loadingSpecializations, setLoadingSpecializations] = useState(false)
  const [degree, setDegree] = useState('')
  const [experience_years, setExperienceYears] = useState('')
  const [consultation_fee, setConsultationFee] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Pre-select role from query param
    const params = new URLSearchParams(window.location.search)
    const qRole = params.get('role')
    if (qRole === 'doctor') setRole('doctor')
  }, [])

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

  useEffect(() => {
    const loadSpecializations = async () => {
      try {
        setLoadingSpecializations(true)
        const { data: specs, error } = await getSpecializations()
        if (error) {
          console.warn('[Register] could not load specializations:', error)
          setSpecializationsList(DEFAULT_SPECIALIZATIONS)
        } else if (specs && specs.length > 0) {
          setSpecializationsList(specs)
        } else {
          setSpecializationsList(DEFAULT_SPECIALIZATIONS)
        }
      } catch (err) {
        console.warn('[Register] loadSpecializations error:', err)
        setSpecializationsList(DEFAULT_SPECIALIZATIONS)
      } finally {
        setLoadingSpecializations(false)
      }
    }

    loadSpecializations()
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }

    // Validate doctor-specific fields if registering as doctor
    if (role === 'doctor') {
      if (!specialization) {
        setError('Please select a specialization')
        return
      }
      if (!degree.trim()) {
        setError('Degree is required')
        return
      }
      if (!experience_years || experience_years < 0) {
        setError('Please enter valid experience years')
        return
      }
      if (!consultation_fee || consultation_fee < 0) {
        setError('Please enter valid consultation fee')
        return
      }
    }

    setLoading(true)

    try {
      // Sign up using Supabase directly with role in metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
            full_name: fullName,
          },
        },
      })

      if (error) {
        // Handle "User already exists" error
        if (error.message && error.message.toLowerCase().includes('already exists')) {
          setError('This email is already registered. Please sign in instead.')
          setTimeout(() => {
            router.push('/login')
          }, 1200)
          setLoading(false)
          return
        }
        setError(error.message || 'Failed to create account. Please try again.')
        setLoading(false)
        return
      }

      // Success!
      const createdUserId = data.user?.id
      if (!createdUserId) {
        setError('Account created, but user ID was not returned. Please try signing in.')
        setLoading(false)
        return
      }

      // Create profile in users_extended (crucial for dashboard and avatar)
      try {
        await supabase
          .from('users_extended')
          .insert({
            id: createdUserId,
            full_name: fullName,
            role: role
          })
      } catch (profileErr) {
        console.warn('[Register] Profile creation error (non-blocking):', profileErr)
      }

      // Create doctor profile in background if registering as doctor (non-blocking)
      if (role === 'doctor') {
        ;(async () => {
          try {
            const { error: doctorError } = await supabase
              .from('doctors')
              .insert({
                id: createdUserId,
                full_name: fullName,
                specialization,
                experience_years: experience_years ? parseInt(experience_years, 10) : null,
                consultation_fee: consultation_fee ? parseFloat(consultation_fee) : null,
              })

            if (doctorError) {
              console.warn('[Register] Doctor profile creation failed:', doctorError)
            }
          } catch (err) {
            console.warn('[Register] Doctor profile creation error:', err)
          }
        })()
      }

      setSuccess('✓ Registration successful! Redirecting...')

      // Determine redirect URL
      let redirectTo = '/patient-dashboard'
      if (role === 'doctor') redirectTo = '/doctor-dashboard'

      // Instant redirect (no delay) - middleware will confirm auth
      router.replace(redirectTo)
    } catch (err) {
      console.error('[Register] Error:', err)
      setError(getErrorMessage(err) || 'An unexpected error occurred')
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
      <div className="w-full max-w-md bg-linear-to-br from-teal-500/50 to-blue-900/30 p-8 rounded-2xl shadow-lg border border-gray-200 max-h-screen overflow-y-auto backdrop-blur-sm relative z-10">
        <div className="mb-4">
          <button onClick={() => router.push('/login')} className="text-teal-600 font-semibold hover:text-teal-700">
            ← Back to Login
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-linear-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl">♥</span>
          </div>
          <h1 className="text-3xl font-semibold mb-2 text-white-600">
            {role === 'patient' ? 'Patient Registration' : 'Doctor Registration'}
          </h1>
          <p className="text-gray-700 text-sm">
            {role === 'patient' 
              ? 'Register to book appointments with top doctors' 
              : 'Register as a doctor to start seeing patients'}
          </p>
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

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">I am a</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
              required
            />
          </div>

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
              placeholder="Create a strong password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
              required
            />
          </div>

          {role === 'doctor' && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Specialization</label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
                  required
                >
                  <option value="">{loadingSpecializations ? 'Loading specializations...' : 'Select specialization'}</option>
                  {specializationsList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Degree</label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="eg.MBBS, MD"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-600"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Experience (years)</label>
                  <input
                    type="number"
                    value={experience_years}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="eg., 1,2,3..."
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Consultation Fee</label>
                  <input
                    type="number"
                    value={consultation_fee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    placeholder="Rs."
                    min="0"
                    step="01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-gray-900 placeholder-gray-900"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-linear-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-7 text-center text-gray-900 text-md">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:text-white font-semibold">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  )
}

