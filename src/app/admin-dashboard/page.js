'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import RequireAuth from '@/components/RequireAuth'

export default function AdminDashboardPage() {
  const supabase = getSupabaseClient()
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [conflictLogs, setConflictLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedConflict, setSelectedConflict] = useState(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
    conflicts: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setAccessToken(session.access_token)

        try {
          const res = await fetch('/api/admin/data', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })

          if (res.ok) {
            const { users, appointments, conflicts } = await res.json()

            setAllUsers(users || [])
            setAppointments(appointments || [])
            setConflictLogs(conflicts || [])

            const appts = appointments || []
            const allU = users || []
            setStats({
              totalUsers: allU.length,
              totalDoctors: allU.filter(u => u.role === 'doctor').length,
              totalPatients: allU.filter(u => u.role === 'patient').length,
              totalAppointments: appts.length,
              pendingAppointments: appts.filter(a => a.status === 'pending').length,
              confirmedAppointments: appts.filter(a => a.status === 'confirmed').length,
              conflicts: (conflicts || []).length,
            })
          } else {
            console.error('[AdminDashboard] Failed to fetch admin data:', await res.text())
          }
        } catch (err) {
          console.error('[AdminDashboard] Fetch error:', err)
        }
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
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

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'doctor':
        return 'bg-blue-600/50 text-blue-200'
      case 'patient':
        return 'bg-green-600/50 text-green-200'
      case 'admin':
        return 'bg-red-600/50 text-red-200'
      default:
        return 'bg-gray-600/50 text-gray-200'
    }
  }

  const closeModal = () => {
    setSelectedAppointment(null)
    setSelectedUser(null)
    setSelectedConflict(null)
  }

  return (
    <RequireAuth>
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute top-40 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative flex justify-between items-center px-6 md:px-10 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">MediBook Admin</h1>
          <p className="text-xs md:text-sm text-gray-400">Administrator Panel</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (!confirm('Delete your admin account? This will remove admin access and log you out.')) return
              try {
                const token = accessToken || (await supabase.auth.getSession()).data.session?.access_token
                if (!token) throw new Error('Unable to confirm session')
                const res = await fetch('/api/admin/delete-account', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Failed to delete account')
                // On success, redirect home
                window.location.href = '/'
              } catch (err) {
                console.error('Admin delete error:', err)
                alert('Failed to delete admin account: ' + (err.message || err))
              }
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-md hover:brightness-105 transition-all duration-200"
          >
            Delete Account
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-linear-to-r from-red-500 to-red-600 text-white font-semibold shadow-md hover:shadow-red-900/40 hover:brightness-110 transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-gray-400">
              System overview, user insights, and appointment monitoring in one advanced console.
            </p>
          </div>
          {user && (
            <div className="hidden md:flex items-center gap-3 rounded-full bg-slate-900/70 border border-slate-700 px-4 py-2 backdrop-blur">
              <div className="h-8 w-8 rounded-full bg-linear-to-br from-teal-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                {user.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="text-xs">
                <p className="text-gray-300 font-semibold truncate max-w-[160px]">{user.email}</p>
                <p className="text-[10px] text-emerald-400">Admin session active</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="group relative overflow-hidden rounded-2xl border border-blue-500/40 bg-linear-to-br from-slate-900/80 to-slate-900/40 p-4 shadow-lg shadow-blue-900/10">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-linear-to-br from-blue-500/10 to-teal-500/10" />
            <div className="relative">
            <p className="text-gray-400 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-white mt-1 group-hover:scale-105 transition-transform duration-150">
              {stats.totalUsers}
            </p>
            <p className="mt-2 text-xs text-blue-300/80">All registered roles in the system</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-purple-500/40 bg-linear-to-br from-slate-900/80 to-slate-900/40 p-4 shadow-lg shadow-purple-900/10">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-linear-to-br from-purple-500/10 to-pink-500/10" />
            <div className="relative">
            <p className="text-gray-400 text-sm">Doctors</p>
            <p className="text-3xl font-bold text-purple-200 mt-1 group-hover:scale-105 transition-transform duration-150">
              {stats.totalDoctors}
            </p>
            <p className="mt-2 text-xs text-purple-200/80">Active verified doctors</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-linear-to-br from-slate-900/80 to-slate-900/40 p-4 shadow-lg shadow-emerald-900/10">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-linear-to-br from-emerald-500/10 to-teal-500/10" />
            <div className="relative">
            <p className="text-gray-400 text-sm">Patients</p>
            <p className="text-3xl font-bold text-emerald-200 mt-1 group-hover:scale-105 transition-transform duration-150">
              {stats.totalPatients}
            </p>
            <p className="mt-2 text-xs text-emerald-200/80">Registered patient profiles</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-amber-500/40 bg-linear-to-br from-slate-900/80 to-slate-900/40 p-4 shadow-lg shadow-amber-900/10">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-linear-to-br from-amber-500/10 to-orange-500/10" />
            <div className="relative">
            <p className="text-gray-400 text-sm">Total Appointments</p>
            <p className="text-3xl font-bold text-amber-200 mt-1 group-hover:scale-105 transition-transform duration-150">
              {stats.totalAppointments}
            </p>
            <p className="mt-2 text-xs text-amber-200/80">Across all doctors and patients</p>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-2xl border border-amber-500/40 bg-slate-900/70 p-4 shadow-md hover:shadow-amber-900/30 transition-shadow duration-200">
            <p className="text-gray-400 text-sm">Pending Appointments</p>
            <p className="text-2xl font-bold text-amber-200 mt-1">{stats.pendingAppointments}</p>
            <p className="mt-1 text-[11px] text-amber-200/80">Awaiting confirmation</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-4 shadow-md hover:shadow-emerald-900/30 transition-shadow duration-200">
            <p className="text-gray-400 text-sm">Confirmed Appointments</p>
            <p className="text-2xl font-bold text-emerald-200 mt-1">{stats.confirmedAppointments}</p>
            <p className="mt-1 text-[11px] text-emerald-200/80">Locked in the schedule</p>
          </div>
          <div className="rounded-2xl border border-rose-500/40 bg-slate-900/70 p-4 shadow-md hover:shadow-rose-900/30 transition-shadow duration-200">
            <p className="text-gray-400 text-sm">Booking Conflicts</p>
            <p className="text-2xl font-bold text-rose-200 mt-1">{stats.conflicts}</p>
            <p className="mt-1 text-[11px] text-rose-200/80">Detected double-booking attempts</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 md:gap-4 mb-6 border-b border-slate-800">
          {['overview', 'appointments', 'users', 'conflicts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-semibold rounded-t-lg transition-all duration-150 ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900'
                  : 'text-gray-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/40">
              <h3 className="text-lg font-bold text-white mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-gray-400">Database Status</p>
                  <span className="px-3 py-1 bg-green-600/50 text-green-200 text-sm rounded">Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-400">Auth System</p>
                  <span className="px-3 py-1 bg-green-600/50 text-green-200 text-sm rounded">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-400">Conflict Prevention</p>
                  <span className="px-3 py-1 bg-green-600/50 text-green-200 text-sm rounded">Enabled</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/40">
              <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
              <p className="text-gray-400 text-sm">Last 7 days: {appointments.length} total appointments</p>
              <p className="text-gray-400 text-sm mt-4">Appointment Status Breakdown:</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li>✓ Confirmed: {stats.confirmedAppointments}</li>
                <li>⏳ Pending: {stats.pendingAppointments}</li>
                <li>✕ Cancelled: {appointments.filter(a => a.status === 'cancelled').length}</li>
                <li>✔ Completed: {appointments.filter(a => a.status === 'completed').length}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-x-auto shadow-lg shadow-slate-900/40">
            <table className="w-full">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Doctor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Patient</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date & Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.slice(0, 10).map((apt, idx) => (
                  <tr
                    key={apt.id}
                    className={`cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-900/40'} hover:bg-slate-700/60`}
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <td className="px-6 py-4 text-white text-sm">{apt.doctor_name || '—'}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{apt.patient_name || 'Guest'}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{apt.appointment_date} {apt.appointment_time}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(apt.status)}`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-x-auto shadow-lg shadow-slate-900/40">
            <table className="w-full">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Joined</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.slice(0, 10).map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-900/40'} hover:bg-slate-700/60`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <td className="px-6 py-4 text-white text-sm">{u.full_name}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{u.email || `ID: ${u.id.slice(0, 8)}...`}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getRoleColor(u.role)}`}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Conflicts Tab */}
        {activeTab === 'conflicts' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/40">
            {conflictLogs.length === 0 ? (
              <p className="text-gray-400">No booking conflicts recorded</p>
            ) : (
              <div className="space-y-4">
                {conflictLogs.map((log, idx) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedConflict(log)}
                    className="w-full text-left border border-slate-700 p-4 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 transition-colors"
                  >
                    <p className="text-sm text-gray-400">
                      <span className="font-semibold text-white">Conflict Attempt #{idx + 1}</span> - {new Date(log.attempted_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Doctor ID: {log.doctor_id.slice(0, 8)}...</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detail Modals */}
        {(selectedAppointment || selectedUser || selectedConflict) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={closeModal}
          >
            <div
              className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>

              {selectedAppointment && (
                <>
                  <h3 className="text-xl font-semibold mb-4">Appointment Details</h3>
                  <div className="space-y-2 text-sm text-gray-200">
                    <p><span className="font-semibold text-gray-300">Doctor:</span> {selectedAppointment.doctor_name || 'N/A'}</p>
                    <p><span className="font-semibold text-gray-300">Patient:</span> {selectedAppointment.patient_name || 'Guest / N/A'}</p>
                    <p><span className="font-semibold text-gray-300">Date:</span> {selectedAppointment.appointment_date} {selectedAppointment.appointment_time}</p>
                    <p>
                      <span className="font-semibold text-gray-300">Status:</span>{' '}
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(selectedAppointment.status)}`}>
                        {selectedAppointment.status?.charAt(0).toUpperCase() + selectedAppointment.status?.slice(1)}
                      </span>
                    </p>
                    {selectedAppointment.consultation_mode && (
                      <p><span className="font-semibold text-gray-300">Mode:</span> {selectedAppointment.consultation_mode}</p>
                    )}
                    {selectedAppointment.reason_for_visit && (
                      <p className="mt-2 text-gray-300">
                        <span className="font-semibold text-gray-300">Reason:</span> {selectedAppointment.reason_for_visit}
                      </p>
                    )}
                    {selectedAppointment.notes && (
                      <p className="mt-1 text-gray-400 text-xs whitespace-pre-line">
                        <span className="font-semibold text-gray-300">Notes:</span> {selectedAppointment.notes}
                      </p>
                    )}
                  </div>
                </>
              )}

              {!selectedAppointment && selectedUser && (
                <>
                  <h3 className="text-xl font-semibold mb-4">User Details</h3>
                  <div className="space-y-2 text-sm text-gray-200">
                    <p><span className="font-semibold text-gray-300">Name:</span> {selectedUser.full_name || 'N/A'}</p>
                    <p><span className="font-semibold text-gray-300">Email:</span> {selectedUser.email || 'N/A'}</p>
                    <p><span className="font-semibold text-gray-300">User ID:</span> {selectedUser.id}</p>
                    <p>
                      <span className="font-semibold text-gray-300">Role:</span>{' '}
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role?.charAt(0).toUpperCase() + selectedUser.role?.slice(1)}
                      </span>
                    </p>
                    {selectedUser.phone && (
                      <p><span className="font-semibold text-gray-300">Phone:</span> {selectedUser.phone}</p>
                    )}
                    <p><span className="font-semibold text-gray-300">Joined:</span> {new Date(selectedUser.created_at).toLocaleString()}</p>
                  </div>
                </>
              )}

              {!selectedAppointment && !selectedUser && selectedConflict && (
                <>
                  <h3 className="text-xl font-semibold mb-4">Booking Conflict</h3>
                  <div className="space-y-2 text-sm text-gray-200">
                    <p><span className="font-semibold text-gray-300">Doctor ID:</span> {selectedConflict.doctor_id}</p>
                    <p><span className="font-semibold text-gray-300">Attempted At:</span> {new Date(selectedConflict.attempted_at).toLocaleString()}</p>
                    {selectedConflict.conflicting_appointments && (
                      <pre className="mt-3 text-xs text-gray-300 bg-slate-950/80 border border-slate-700 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(selectedConflict.conflicting_appointments, null, 2)}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </RequireAuth>
  )
}

