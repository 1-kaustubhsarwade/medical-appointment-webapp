'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { logError } from '@/lib/errorHandler'
import { DEFAULT_SPECIALIZATIONS } from '@/lib/specializations'

export default function DoctorProfilePage() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { user, profile, loading: authLoading } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Form state
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    specialization: '',
    degree: '',
    experience_years: '',
    consultation_fee: '',
    license_number: '',
    bio: '',
  })

  // Redirect if not logged in or not a doctor once auth is resolved
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    const role = user.user_metadata?.role || profile?.role || 'patient'
    if (role !== 'doctor') {
      router.replace('/')
    }
  }, [authLoading, user, profile, router])

  // Fetch doctor-specific row separately
  useEffect(() => {
    if (authLoading) return
    if (!user) return

    const fetchDoctor = async () => {
      const { data: doctorRow, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (doctorError) {
        logError('DoctorProfile.fetchDoctor', doctorError)
        setError('Could not load doctor details.')
      } else {
        setDoctor(doctorRow || null)
      }
    }

    fetchDoctor()
  }, [authLoading, user])

  // Populate form whenever data arrives or edit mode opens
  useEffect(() => {
    if (!isEditing) return
    const displayProfile = profile || { full_name: user?.user_metadata?.full_name || '', phone: '' }
    setForm({
      full_name: displayProfile.full_name || '',
      phone: displayProfile.phone || '',
      specialization: doctor?.specialization || '',
      degree: doctor?.degree || '',
      experience_years: doctor?.experience_years ?? '',
      consultation_fee: doctor?.consultation_fee ?? '',
      license_number: doctor?.license_number || '',
      bio: doctor?.bio || '',
    })
    setSaveError('')
    setSaveSuccess(false)
  }, [isEditing])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      // 1. Update users_extended (full_name, phone)
      const { error: profileError } = await supabase
        .from('users_extended')
        .update({
          full_name: form.full_name.trim() || null,
          phone: form.phone.trim() || null,
        })
        .eq('id', user.id)

      if (profileError) {
        throw new Error('Failed to update basic info: ' + profileError.message)
      }

      // 2. Upsert doctors row
      const doctorPayload = {
        id: user.id,
        full_name: form.full_name.trim() || null,
        specialization: form.specialization || null,
        degree: form.degree.trim() || null,
        experience_years: form.experience_years !== '' ? Number(form.experience_years) : null,
        consultation_fee: form.consultation_fee !== '' ? Number(form.consultation_fee) : null,
        license_number: form.license_number.trim() || null,
        bio: form.bio.trim() || null,
      }

      const { data: upsertedDoctor, error: doctorError } = await supabase
        .from('doctors')
        .upsert(doctorPayload, { onConflict: 'id' })
        .select()
        .maybeSingle()

      if (doctorError) {
        throw new Error('Failed to update doctor details: ' + doctorError.message)
      }

      setDoctor(upsertedDoctor || { ...doctor, ...doctorPayload })
      setSaveSuccess(true)
      setIsEditing(false)
    } catch (err) {
      logError('DoctorProfile.handleSave', err)
      setSaveError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl max-w-md text-center">
          {error}
        </div>
      </main>
    )
  }

  if (!user) return null

  const displayProfile = profile || {
    full_name: user.user_metadata?.full_name || '',
    phone: null,
    created_at: user.created_at,
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white'
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <main
      className="min-h-screen text-gray-900"
      style={{
        backgroundImage: `url(${encodeURI('/Screenshot 2026-03-01 231922.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">♥</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-teal-600">MediBook Doctor</h1>
            <p className="text-xs text-gray-500">Doctor Profile</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/doctor-dashboard')}
          className="px-4 py-2 bg-linear-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition text-sm"
        >
          Back to Dashboard
        </button>
      </nav>

      {/* Content */}
      <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-5xl font-bold mb-3 text-yellow-700  hover:text-teal-600">Your Profile</h2>
            <p className="text-gray-900">
              {isEditing
                ? 'Update your professional details below, then click Save.'
                : 'View your professional details as seen by patients when booking appointments.'}
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-700 hover:bg-teal-600 text-white rounded-lg font-semibold transition text-sm shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Success banner */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Profile updated successfully!
          </div>
        )}

        {/* Save error banner */}
        {saveError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {saveError}
          </div>
        )}

        {isEditing ? (
          /* ─── EDIT MODE ─── */
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-teal-200 rounded-2xl border border-teal-100 p-6">
              <h3 className="text-xl font-bold mb-5 text-teal-700">Basic Information</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Dr. John Smith"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 555 000 0000"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Doctor Details */}
            <div className="bg-blue-100 rounded-2xl border border-blue-100 p-6">
              <h3 className="text-xl font-bold mb-5 text-gray-900">Doctor Details</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Specialization</label>
                  <select
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">— Select specialization —</option>
                    {DEFAULT_SPECIALIZATIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Degree / Qualification</label>
                  <input
                    type="text"
                    name="degree"
                    value={form.degree}
                    onChange={handleChange}
                    placeholder="e.g. MBBS, MD"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Years of Experience</label>
                  <input
                    type="number"
                    name="experience_years"
                    value={form.experience_years}
                    onChange={handleChange}
                    min="0"
                    max="60"
                    placeholder="e.g. 5"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Consultation Fee ($)</label>
                  <input
                    type="number"
                    name="consultation_fee"
                    value={form.consultation_fee}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g. 100"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>License Number</label>
                  <input
                    type="text"
                    name="license_number"
                    value={form.license_number}
                    onChange={handleChange}
                    placeholder="e.g. MED-2024-00123"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Bio / About</label>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    rows={4}
                    placeholder="A short description about yourself, your experience, and areas of expertise..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setIsEditing(false); setSaveError('') }}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg border border-white text-gray-900 font-semibold hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-teal-500 hover:bg-sky-400 disabled:opacity-60 text-white rounded-lg font-semibold transition text-sm shadow-sm flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          /* ─── VIEW MODE ─── */
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Basic info */}
            <div className="bg-yellow-600 rounded-2xl shadow-sm  hover:bg-teal-400 border border-pink-900 p-6">
              <h3 className="text-xl font-bold mb-4 text-white">Basic Information</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-800">Full Name</dt>
                  <dd className="font-semibold text-white text-right">{displayProfile.full_name || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-800">Role</dt>
                  <dd className="font-semibold text-white text-right">Doctor</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-800">Phone</dt>
                  <dd className="font-semibold text-white text-right">{displayProfile.phone || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-800">Email</dt>
                  <dd className="font-semibold text-white text-right">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-800">Joined</dt>
                  <dd className="font-semibold text-white text-right">
                    {displayProfile.created_at ? new Date(displayProfile.created_at).toLocaleDateString() : '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Right: Doctor details */}
            <div className="bg-zinc-300 rounded-2xl  hover:bg-teal-400 border border-teal-300 p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Doctor Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Specialization</dt>
                  <dd className="font-semibold text-gray-900 text-right">{doctor?.specialization || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Degree</dt>
                  <dd className="font-semibold text-gray-900 text-right">{doctor?.degree || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Experience</dt>
                  <dd className="font-semibold text-gray-900 text-right">
                    {doctor?.experience_years != null ? `${doctor.experience_years} years` : 'Not set'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Consultation Fee</dt>
                  <dd className="font-semibold text-gray-900 text-right">
                    {doctor?.consultation_fee != null ? `Rs${doctor.consultation_fee}` : 'Not set'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">License Number</dt>
                  <dd className="font-semibold text-gray-900 text-right">{doctor?.license_number || 'Not set'}</dd>
                </div>
                {doctor?.bio && (
                  <div className="pt-2 border-t border-blue-100 mt-2">
                    <dt className="text-gray-600 mb-1">Bio</dt>
                    <dd className="text-gray-800 text-sm leading-relaxed">{doctor.bio}</dd>
                  </div>
                )}
                {!doctor?.bio && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Bio</dt>
                    <dd className="font-semibold text-gray-900 text-right">Not set</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}


