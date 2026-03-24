'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPatientAppointments, cancelAppointment } from '@/lib/db'
import RequireAuth from '@/components/RequireAuth'

export default function MyAppointmentsPage() {
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    if (confirm('Are you sure you want to cancel this appointment?')) {
      const { error: cancelError } = await cancelAppointment(appointmentId)
      
      if (!cancelError) {
        setAppointments(appointments.map(apt => 
          apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
        ))
      } else {
        setError('Failed to cancel appointment')
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
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
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-black">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-slate-800/50 border-b border-slate-700">
        <Link href="/dashboard" className="text-xl font-bold text-white">MediBook</Link>
        <Link href="/dashboard" className="text-gray-400 hover:text-white">← Dashboard</Link>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-8">My Appointments</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 rounded-lg">
            <p className="text-gray-400 text-lg mb-4">No appointments yet</p>
            <Link href="/book" className="text-blue-400 hover:underline">
              Book your first appointment →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map(apt => (
              <div key={apt.id} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 mb-4 md:mb-0">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {apt.doctor?.users_extended?.full_name} - {apt.doctor?.specialization}
                    </h3>
                    <div className="space-y-1 text-gray-400">
                      <p>📅 {new Date(apt.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                      <p>⏰ {apt.appointment_time}</p>
                      <p>💬 {apt.consultation_mode}</p>
                      {apt.reason_for_visit && <p>🔍 {apt.reason_for_visit}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:items-end">
                    <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(apt.status)}`}>
                      {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </span>

                    {apt.status === 'pending' || apt.status === 'confirmed' ? (
                      <button
                        onClick={() => handleCancel(apt.id)}
                        className="px-4 py-2 bg-red-600/50 hover:bg-red-600 text-red-200 rounded transition"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </RequireAuth>
  )
}

