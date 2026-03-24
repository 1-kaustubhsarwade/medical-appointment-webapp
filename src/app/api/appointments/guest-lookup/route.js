import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * GET /api/appointments/guest-lookup?email=guest@example.com
 * Looks up guest bookings by matching the email inside the notes field.
 * Guest appointments have patient_id IS NULL and notes starting with "Guest Booking".
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || '').trim().toLowerCase()

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Fetch guest appointments (patient_id is null, notes contain the guest email)
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        appointment_date,
        appointment_time,
        status,
        notes,
        created_at,
        doctors:doctor_id (
          id,
          full_name,
          specialization,
          consultation_fee
        )
      `)
      .is('patient_id', null)
      .ilike('notes', `%Email: ${email}%`)
      .order('appointment_date', { ascending: false })

    if (error) {
      console.error('[guest-lookup] Query error:', error)
      return Response.json({ error: 'Failed to look up appointments' }, { status: 500 })
    }

    // Parse guest details from notes for each appointment
    const parsed = (appointments || []).map(apt => {
      const lines = (apt.notes || '').split('\n')
      const guestName = lines.find(l => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Guest'
      const guestEmail = lines.find(l => l.startsWith('Email:'))?.replace('Email:', '').trim() || ''
      const guestPhone = lines.find(l => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || ''
      const reason = lines.find(l => l.startsWith('Reason:'))?.replace('Reason:', '').trim() || apt.reason_for_visit || ''

      return {
        id: apt.id,
        doctor_name: apt.doctors?.full_name || 'Doctor',
        specialization: apt.doctors?.specialization || '',
        consultation_fee: apt.doctors?.consultation_fee || null,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        reason,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        created_at: apt.created_at,
      }
    })

    return Response.json({ appointments: parsed }, { status: 200 })
  } catch (err) {
    console.error('[guest-lookup] Error:', err)
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

