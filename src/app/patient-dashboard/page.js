"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getPatientAppointments, cancelAppointment } from '@/lib/db'
import UserAvatar from '@/components/UserAvatar'
import RequireAuth from '@/components/RequireAuth'

export default function PatientDashboardPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [user, setUser] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data: appts } = await getPatientAppointments(session.user.id)
        setAppointments(appts || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleCancel = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    const { error } = await cancelAppointment(appointmentId)
    if (!error) {
      setAppointments(appointments.map(a => a.id === appointmentId ? { ...a, status: 'cancelled' } : a))
    } else {
      alert('Failed to cancel appointment')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'confirmed':
        return 'bg-green-600/50 text-green-200'
      case 'pending':
        return 'bg-yellow-600/50 text-yellow-200'
      case 'completed':
        return 'bg-blue-600/50 text-blue-200'
      case 'cancelled':
        return 'bg-red-600/50 text-red-200'
      default:
        return 'bg-gray-600/50 text-gray-200'
    }
  }

  return (
    <RequireAuth>
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-teal-50">
      {/* Navbar (aligned with Doctor Dashboard style) */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">♥</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-teal-600">MediBook Patient</h1>
            <p className="text-xs text-gray-500">
              {user ? `@${user.email?.split('@')[0]}` : 'Patient Portal'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserAvatar dashboardPath="/patient-dashboard" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Dashboard</h1>
          <p className="text-gray-600">View your upcoming appointments and manage bookings</p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Appointments</h2>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No appointments yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600 border-b">
                      <th className="px-6 py-3">Doctor</th>
                      <th className="px-6 py-3">Date & Time</th>
                      <th className="px-6 py-3">Reason</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt, idx) => (
                      <tr key={apt.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4 text-gray-900">
                          <div>
                            <p className="font-semibold">Dr. {apt.doctor?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{apt.doctor?.specialization}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">
                          {new Date(apt.appointment_date).toLocaleDateString()} {apt.appointment_time}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-sm">{apt.notes}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(apt.status)}`}>
                            {apt.status?.charAt(0).toUpperCase() + (apt.status?.slice(1) || '')}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-x-2 flex">
                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <button
                              onClick={() => handleCancel(apt.id)}
                              className="px-3 py-1 border border-red-300 text-red-600 text-xs rounded transition"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Book New Appointment Bar */}
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => router.push('/book')}
            className="bg-linear-to-r from-teal-500 to-blue-600 p-6 rounded-2xl shadow-sm border border-teal-300 hover:shadow-md transition transform hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="text-lg font-bold text-white mb-1">Book New Appointment</h3>
                <p className="text-teal-100 text-sm">Schedule your next consultation with a doctor</p>
              </div>
              <div className="text-3xl text-white">→</div>
            </div>
          </button>
        </div>
      </div>
    </div>
    </RequireAuth>
  )
}

