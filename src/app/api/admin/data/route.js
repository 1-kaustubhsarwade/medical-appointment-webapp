import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/data
 * Returns all users, doctors, appointments, and conflict logs using the
 * service-role key so RLS policies are bypassed.
 *
 * Requires: Authorization: Bearer <access_token>
 * The token is verified to belong to an admin before data is returned.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '').trim()

    const supabase = await createAdminClient()

    // Verify the caller is the authenticated admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 })
    }
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    // ── Auth users (includes email) ──────────────────────────────────────────
    let authUsers = []
    try {
      const listResult = await supabase.auth.admin.listUsers({ perPage: 1000 })
      authUsers = listResult?.data?.users || listResult?.users || []
    } catch (_) {
      // If admin.listUsers is unavailable, fall back to users_extended only
    }

    // ── Extended profiles ────────────────────────────────────────────────────
    const { data: profiles } = await supabase
      .from('users_extended')
      .select('id, full_name, phone, role, created_at')

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {})

    // ── Doctors table ────────────────────────────────────────────────────────
    const { data: doctors } = await supabase
      .from('doctors')
      .select('*')

    const doctorIds = new Set((doctors || []).map(d => d.id))

    // ── Build unified user list ──────────────────────────────────────────────
    // Prefer auth users array; fall back to profiles only when listUsers unavailable
    let users
    if (authUsers.length > 0) {
      users = authUsers.map(u => {
        const profile = profileMap[u.id]
        const isDoctor = doctorIds.has(u.id)
        const role =
          u.user_metadata?.role ||
          profile?.role ||
          (isDoctor ? 'doctor' : 'patient')
        // Doctors in the doctors table but not in users_extended still get their name
        const doctorRow = (doctors || []).find(d => d.id === u.id)
        return {
          id: u.id,
          email: u.email,
          full_name:
            profile?.full_name ||
            u.user_metadata?.full_name ||
            doctorRow?.full_name ||
            'Unknown',
          role,
          phone: profile?.phone || null,
          created_at: u.created_at,
        }
      })
    } else {
      // Fallback: merge profiles + doctors
      const merged = new Map()
      ;(profiles || []).forEach(p => merged.set(p.id, { ...p, email: null }))
      ;(doctors || []).forEach(d => {
        if (!merged.has(d.id)) {
          merged.set(d.id, {
            id: d.id,
            email: null,
            full_name: d.full_name || 'Unknown',
            role: 'doctor',
            phone: null,
            created_at: d.created_at || null,
          })
        }
      })
      users = Array.from(merged.values())
    }

    // ── Appointments ─────────────────────────────────────────────────────────
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true })

    // Enrich appointments with doctor/patient names
    const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc }, {})
    const enrichedAppts = (appointments || []).map(a => ({
      ...a,
      doctor_name: userMap[a.doctor_id]?.full_name || null,
      patient_name: userMap[a.patient_id]?.full_name || null,
    }))

    // ── Conflicts ─────────────────────────────────────────────────────────────
    const { data: conflicts } = await supabase
      .from('appointment_conflicts_log')
      .select('*')
      .order('attempted_at', { ascending: false })

    return NextResponse.json({
      users,
      doctors: doctors || [],
      appointments: enrichedAppts,
      conflicts: conflicts || [],
    })
  } catch (err) {
    console.error('[admin/data] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

