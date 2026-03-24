'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { logError, getErrorMessage } from '@/lib/errorHandler'
import DEFAULT_SPECIALIZATIONS from '@/lib/specializations'

export default function BookAppointmentPage() {
  const router = useRouter()
  const supabaseRef = useRef(getSupabaseClient())
  const supabase = supabaseRef.current
  const [doctors, setDoctors] = useState([])
  const [specializations, setSpecializations] = useState(DEFAULT_SPECIALIZATIONS)
  const [selectedSpecialization, setSelectedSpecialization] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [showTimeSlots, setShowTimeSlots] = useState(false)
  const [reason, setReason] = useState('')
  const [consultationMode, setConsultationMode] = useState('in-person')
  const [loading, setLoading] = useState(false)
  const [loadingSpecializations, setLoadingSpecializations] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // user info (must be logged in)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionUser, setSessionUser] = useState(null)
  const [useAccountDetails, setUseAccountDetails] = useState(false)

  // Guest info (when not authenticated)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  // Derived values
  const [minDate, setMinDate] = useState('')
  const [maxDate, setMaxDate] = useState('')

  // Single effect: session check first, then data loads sequentially.
  // Running them in the same effect prevents concurrent navigator.locks contention
  // that causes AbortError and stuck loading states.
  useEffect(() => {
    const init = async () => {
      // ── Date constraints (synchronous) ──────────────────────────────────
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setMinDate(tomorrow.toISOString().split('T')[0])
      const sixtyDaysLater = new Date()
      sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60)
      setMaxDate(sixtyDaysLater.toISOString().split('T')[0])

      // ── Session check (auth, uses singleton + navigator.locks) ───────────
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setIsAuthenticated(true)
          setSessionUser(session.user)
          // Fetch phone with the same client after the session call resolves
          try {
            const { data: ext } = await supabase
              .from('users_extended')
              .select('phone')
              .eq('id', session.user.id)
              .single()
            if (ext?.phone) session.user._cachedPhone = ext.phone
          } catch (_) {}
        } else {
          setIsAuthenticated(false)
          setSessionUser(null)
        }
      } catch (authErr) {
        if (
          authErr?.name !== 'AbortError' &&
          !String(authErr).toLowerCase().includes('signal is aborted')
        ) {
          console.warn('[BookPage] session check error:', authErr)
        }
        setIsAuthenticated(false)
        setSessionUser(null)
      }

      // ── Specializations (via API route – avoids auth lock contention) ────
      setLoadingSpecializations(true)
      try {
        const res = await fetch('/api/doctors', { method: 'POST' })
        const json = await res.json()
        const specs = json.specializations || []
        setSpecializations(specs.length > 0 ? specs : DEFAULT_SPECIALIZATIONS)
      } catch (err) {
        console.warn('[BookPage] Error loading specializations:', err)
        setSpecializations(DEFAULT_SPECIALIZATIONS)
      } finally {
        setLoadingSpecializations(false)
      }
    }

    init()
  }, [])

  useEffect(() => {
    const loadDoctors = async () => {
      if (!selectedSpecialization) {
        setDoctors([])
        return
      }

      try {
        setLoadingDoctors(true)
        setDoctors([])

        // Use the API route (service-role key) to avoid auth lock contention
        const res = await fetch(
          `/api/doctors?specialization=${encodeURIComponent(selectedSpecialization)}`
        )
        const json = await res.json()

        if (!res.ok) {
          console.error('[BookPage] Failed to load doctors:', json.error)
          setDoctors([])
          return
        }

        setDoctors(json.doctors || [])
      } catch (err) {
        console.error('[BookPage] Error loading doctors:', err)
        setDoctors([])
        // If a specialization is selected, fetch doctors for that specialization
        if (selectedSpecialization) {
          const { data, error: fetchError } = await getDoctorsBySpecialization(selectedSpecialization)

          if (fetchError) {
            // If the fetch was aborted, ignore the error (navigation/unmount)
            if (fetchError?.name === 'AbortError' || String(fetchError).includes('signal is aborted')) {
              return
            }
            logError('Failed to load doctors from database', fetchError)
            throw new Error('Unable to load doctor list')
          }

          if (data && data.length > 0) {
            setDoctors(data)
          } else {
            setDoctors([])
          }
        } else {
          // Use the dedicated db utility which has proper RLS setup
          const { data, error: fetchError } = await getDoctors()

          if (fetchError) {
            // If the fetch was aborted, ignore the error (navigation/unmount)
            if (fetchError?.name === 'AbortError' || String(fetchError).includes('signal is aborted')) {
              return
            }
            logError('Failed to load doctors from database', fetchError)
            throw new Error('Unable to load doctor list')
          }

          if (data && data.length > 0) {
            setDoctors(data)
          } else {
            // Fallback: use mock doctors
            console.warn('No doctors found in database, using mock data')
            setDoctors([
              {
                id: 'mock-1',
                full_name: 'Dr. Sarah Johnson',
                specialization: 'Cardiology',
                experience_years: 10,
                consultation_fee: 150,
                rating: 4.8
              },
              {
                id: 'mock-2',
                full_name: 'Dr. Michael Chen',
                specialization: 'Neurology',
                experience_years: 15,
                consultation_fee: 160,
                rating: 4.9
              },
              {
                id: 'mock-3',
                full_name: 'Dr. Emily Davis',
                specialization: 'Dermatology',
                experience_years: 8,
                consultation_fee: 200,
                rating: 4.7
              }
            ])
          }
        }
      } catch (err) {
        // Ignore abort errors (component unmounted / route change)
        if (err?.name === 'AbortError' || String(err).includes('signal is aborted')) {
          return
        }
        // Use mock doctors as fallback
        console.warn('Using fallback mock doctors:', getErrorMessage(err))
        setDoctors([
          {
            id: 'mock-1',
            full_name: 'Dr. Sarah Johnson',
            specialization: 'Cardiology',
            experience_years: 10,
            consultation_fee: 150,
            rating: 4.8
          },
          {
            id: 'mock-2',
            full_name: 'Dr. Michael Chen',
            specialization: 'Neurology',
            experience_years: 15,
            consultation_fee: 160,
            rating: 4.9
          },
          {
            id: 'mock-3',
            full_name: 'Dr. Emily Davis',
            specialization: 'Dermatology',
            experience_years: 8,
            consultation_fee: 200,
            rating: 4.7
          }
        ])
      } finally {
        setLoadingDoctors(false)
      }
    }

    loadDoctors()
  }, [selectedSpecialization])

  const handleBookAppointment = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedDoctorId || !selectedDate || !selectedTime || !reason) {
      setError('Please fill in all required appointment fields')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Authenticated booking
        const patientId = session.user.id
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patientId,
            doctor_id: selectedDoctorId,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            notes: reason,
            patient_name: isAuthenticated ? userName : null,
          }),
        })

        let data
        try {
          data = await response.json()
        } catch (e) {
          const text = await response.text().catch(() => '')
          throw new Error(text || 'Failed to book appointment')
        }

        if (!response.ok) {
          // include server response for easier debugging
          throw new Error(data?.error || JSON.stringify(data) || 'Failed to book appointment')
        }

        setSuccess('✓ Appointment booked successfully! Redirecting to your dashboard...')
        setTimeout(() => {
          router.push('/patient-dashboard')
        }, 1500)
      } else {
        // Guest booking flow
        if (!guestName || !guestEmail || !guestPhone) {
          setError('Please fill in all your contact information')
          setLoading(false)
          return
        }

        const response = await fetch('/api/appointments/guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guestName,
            guestEmail,
            guestPhone,
            doctor_id: selectedDoctorId,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            reason,
            consultation_mode: consultationMode,
          }),
        })

        let data
        try {
          data = await response.json()
        } catch (e) {
          const text = await response.text().catch(() => '')
          throw new Error(text || 'Failed to book appointment')
        }

        if (!response.ok) {
          throw new Error(data?.error || JSON.stringify(data) || 'Failed to book appointment')
        }

        setSuccess('✓ Appointment booked successfully! Redirecting to your bookings...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      }
    } catch (err) {
      // Ignore abort errors from concurrent auth lock contention – not a user-visible error
      if (err?.name === 'AbortError' || String(err).toLowerCase().includes('signal is aborted')) {
        console.info('[BookPage] request aborted, ignoring')
        setLoading(false)
        return
      }
      logError('Booking error', err)
      setError(getErrorMessage(err) || 'Failed to book appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Time slots available for booking
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30'
  ]

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-teal-50">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <button
          onClick={() => router.push('/')}
          className="text-teal-600 font-semibold hover:text-teal-700"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-teal-400">Appointment Booking For Patients</h1>
        <div className="w-00"></div>
      </nav>

      <div className="max-w-5xl mx-auto p-6 py-12">
        <h2 className="text-4xl font-bold text-violet-900 mb-2">Book Your Appointment Here</h2>
        <p className="text-purple-800 mb-8"> Fill your details below and choose your preferred doctor and time slot in the form and get instant confirmation.</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleBookAppointment} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Left Column: Patient & Appointment Info */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Your Information</h3>

              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      id="use-account"
                      type="checkbox"
                      checked={useAccountDetails}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setUseAccountDetails(checked)
                        if (checked && sessionUser) {
                          setUserName(sessionUser.user_metadata?.full_name || '')
                          setUserEmail(sessionUser.email || '')
                          setUserPhone(sessionUser._cachedPhone || '')
                        } else {
                          setUserName('')
                          setUserEmail('')
                          setUserPhone('')
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="use-account" className="text-sm text-gray-700">Use my account details</label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Phone Number *</label>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+91 00000-00000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Type Your Name"
                      placeholder="Enter Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200  text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200  text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Phone *</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+91 00000-00000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Reason for Visit *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your symptoms or reason for consultation..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 resize-none text-gray-900"
                  rows={5}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">Consultation Mode</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="in-person"
                      checked={consultationMode === 'in-person'}
                      onChange={(e) => setConsultationMode(e.target.value)}
                      className="w-4 h-4 text-teal-600"
                    />
                    <span className="text-gray-700">In-person consultation</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="online"
                      checked={consultationMode === 'online'}
                      onChange={(e) => setConsultationMode(e.target.value)}
                      className="w-4 h-4 text-teal-600"
                    />
                    <span className="text-gray-700">Online consultation</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Doctor & Appointment Selection */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Appointment Details</h3>

              {/* Specialization filter */}
              <div>
                <label htmlFor="specialization-select" className="block text-sm font-semibold mb-2 text-gray-700">
                  Select Specialization *
                </label>
                <select
                  id="specialization-select"
                  value={selectedSpecialization}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedSpecialization(value)
                    // Reset doctor & time/date when specialization changes
                    setSelectedDoctorId('')
                    setSelectedDate('')
                    setSelectedTime('')
                    setShowTimeSlots(false)
                  }}
                  disabled={loadingSpecializations}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 bg-white cursor-pointer disabled:bg-gray-100 disabled:text-gray-500"
                  required
                >
                  <option value="">
                    {loadingSpecializations ? 'Loading specializations...' : '-- Select specialization --'}
                  </option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="doctor-select" className="block text-sm font-semibold mb-2 text-gray-700">
                  Select Doctor *
                </label>
                <select
                  id="doctor-select"
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value)
                    setSelectedDate('')
                    setSelectedTime('')
                  }}
                  disabled={loadingDoctors || !selectedSpecialization}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 bg-white cursor-pointer disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">
                    {!selectedSpecialization 
                      ? '-- Select specialization first --'
                      : loadingDoctors
                      ? 'Loading doctors...'
                      : doctors.length === 0
                      ? '-- No doctors available --'
                      : '-- Select a doctor --'}
                  </option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name || 'Unknown'} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Info Card */}
              {selectedDoctor && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Doctor:</span> Dr. {selectedDoctor.full_name}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Experience:</span> {selectedDoctor.experience_years} years
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Fee:</span> Rs.{selectedDoctor.consultation_fee}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Rating:</span> {selectedDoctor.rating ? `⭐ ${selectedDoctor.rating.toFixed(1)}/5` : 'N/A'}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="date-input" className="block text-sm font-semibold mb-2 text-gray-700">Select Date *</label>
                <input
                  id="date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedTime('')
                    // Automatically open the time picker when a date is chosen
                    if (e.target.value) setShowTimeSlots(true)
                  }}
                  min={minDate}
                  max={maxDate}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Show a Select Time button so user can open time slots explicitly */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowTimeSlots((s) => !s)}
                  disabled={!selectedDate}
                  className={`px-4 py-2 rounded-md font-semibold text-sm transition
                    ${
                      selectedDate
                        ? 'bg-linear-to-r from-teal-600 to-blue-600 text-white shadow-sm hover:opacity-90'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {showTimeSlots ? 'Hide Time Slots' : 'Select Time'}
                </button>
              </div>

              {selectedDate && showTimeSlots && (
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Select Time *</label>
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-3 rounded-lg border-2 font-semibold text-sm transition ${
                          selectedTime === time
                            ? 'border-teal-600 bg-teal-50 text-teal-600'
                            : 'border-gray-300 hover:border-teal-500 text-gray-700 hover:bg-gray-50'
                        }`}
                        aria-pressed={selectedTime === time}
                        aria-label={`Select ${time}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  {selectedTime && (
                    <p className="mt-3 text-sm text-teal-600 font-medium">
                      ✓ Selected: {selectedDate} at {selectedTime}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                (() => {
                  // basic required fields for all bookings
                  if (loading) return true
                  if (!selectedDoctorId || !selectedDate || !selectedTime || !reason) return true

                  // require user fields when authenticated, guest fields otherwise
                  if (isAuthenticated) {
                    return !userName || !userEmail || !userPhone
                  }

                  return !guestName || !guestEmail || !guestPhone
                })()
              }
              className="flex-1 px-6 py-3 bg-linear-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Booking Your Appointment...' : 'Book Appointment'}
            </button>
          </div>
        </form>

        {/* Symptom Checker CTA */}
        <div className="mt-8 p-6 bg-linear-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl text-center">
          <p className="text-gray-700 mb-3 font-medium">Not sure what&#39;s wrong? Try our AI-powered symptom checker first.</p>
          <button
            type="button"
            onClick={() => router.push('/symptom-checker')}
            className="px-6 py-3 bg-linear-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            🩺 Go to Symptom Checker
          </button>
        </div>
      </div>
    </div>
  )
}

