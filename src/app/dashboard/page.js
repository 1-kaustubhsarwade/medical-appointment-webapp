'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Auth redirect state
  // default to true so the page renders immediately (no loading ring)
  const [authChecked, setAuthChecked] = useState(true)

  // Guest lookup state
  const [email, setEmail] = useState('')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [guestName, setGuestName] = useState('')

  // On mount: if user is logged in, redirect to their role-specific dashboard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const role = session.user.user_metadata?.role || 'patient'
          if (role === 'admin') {
            router.replace('/admin-dashboard')
          } else if (role === 'doctor') {
            router.replace('/doctor-dashboard')
          } else {
            router.replace('/patient-dashboard')
          }
          return
        }
      } catch (e) {
        // ignore - treat as guest
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [router, supabase])

  const handleLookup = async (e) => {
    e.preventDefault()
    setError('')
    setAppointments([])
    setSearched(false)
    setGuestName('')

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/guest-lookup?email=${encodeURIComponent(trimmedEmail)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to look up appointments')
      }

      setAppointments(data.appointments || [])
      if (data.appointments?.length > 0) {
        setGuestName(data.appointments[0].guest_name || 'Guest')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
      case 'scheduled': return 'bg-teal-100 text-teal-700 border-teal-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'confirmed': return '✓'
      case 'pending': return '⏳'
      case 'completed': return '✔'
      case 'cancelled': return '✕'
      case 'scheduled': return '📅'
      default: return '•'
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      })
    } catch { return dateStr }
  }

  // NOTE: we intentionally avoid an initial full-screen loading spinner
  // so guests see the lookup UI immediately while auth check runs.

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter(a => ['confirmed', 'scheduled'].includes(a.status?.toLowerCase())).length,
    pending: appointments.filter(a => a.status?.toLowerCase() === 'pending').length,
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-teal-50">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-4 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center shadow">
            <span className="text-white font-bold text-lg">♥</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-teal-600">MediBook</h1>
            <p className="text-[11px] text-gray-600">Guest Booking Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="hidden sm:inline-flex px-4 py-2 text-teal-600 border border-teal-500 rounded-lg text-sm font-semibold hover:bg-teal-50 transition"
          >
            Book Your Appointment
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 bg-linear-to-r from-teal-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition shadow"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-14">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Track Your <span className="text-teal-600"> Bookings</span>
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Enter the email you used while booking to view your appointment status and details.
          </p>
        </div>

        {/* Lookup Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-400 p-6 md:p-8 mb-8">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address "
                className="w-full pl-12 pr-4 py-3.5 border border-gray-400 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 placeholder-gray-400 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-linear-to-r from-teal-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Look Up
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}
        </div>

        {/* Results */}
        {searched && !error && (
          <>
            {appointments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Found</h3>
                <p className="text-gray-500 text-sm mb-6">
                  We couldn't find any guest bookings for this email address.
                </p>
                <Link
                  href="/book"
                  className="inline-flex px-6 py-3 bg-linear-to-r from-teal-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition shadow text-sm"
                >
                  Book Your First Appointment →
                </Link>
              </div>
            ) : (
              <>
                {/* Welcome + Stats */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Welcome back, {guestName}!
                  </h2>
                  <p className="text-sm text-gray-500">Here are your guest bookings</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Bookings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Confirmed</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.confirmed}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Pending</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-linear-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-teal-600 font-bold text-sm">
                                {(apt.doctor_name || 'D')[0]}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{apt.doctor_name}</h3>
                              <p className="text-xs text-gray-500">{apt.specialization}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400">📅</span>
                              {formatDate(apt.appointment_date)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400">⏰</span>
                              {apt.appointment_time || 'N/A'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400">💬</span>
                              {apt.consultation_mode || 'In-person'}
                            </div>
                            {apt.reason && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <span className="text-gray-400">🔍</span>
                                <span className="truncate">{apt.reason}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end gap-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(apt.status)}`}>
                            {getStatusIcon(apt.status)} {(apt.status || 'Unknown').charAt(0).toUpperCase() + (apt.status || 'unknown').slice(1)}
                          </span>
                          {apt.consultation_fee && (
                            <span className="text-xs text-gray-400">Rs{apt.consultation_fee}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/book"
                    className="px-6 py-3 bg-linear-to-r from-teal-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition shadow text-sm text-center"
                  >
                    Book Another Appointment
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm text-center"
                  >
                    Create an Account for More Features
                  </Link>
                </div>
              </>
            )}
          </>
        )}

        {/* Info section for guests who haven't searched yet */}
        {!searched && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white rounded-2xl border border-blue-300 p-6 shadow-sm text-center">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Track Bookings</h3>
              <p className="text-xs text-gray-600">Find your appointments using your email</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-300 p-6 shadow-sm text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">View Status</h3>
              <p className="text-xs text-gray-600">Check the status of Your appointment</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-300 p-6 shadow-sm text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Register for More</h3>
              <p className="text-xs text-gray-600">Create an account to personally manage your appointments and records</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-16 py-6 px-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} MediBook — Guest Booking Portal. <Link href="/login" className="text-teal-600 hover:underline">Sign in</Link> or <Link href="/register" className="text-teal-600 hover:underline">Register</Link> for full access.
      </footer>
    </div>
  )
}

