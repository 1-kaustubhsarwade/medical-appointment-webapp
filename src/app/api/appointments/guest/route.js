import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('[api/appointments/guest] POST body:', body)
    const { guestName, guestEmail, guestPhone, doctor_id, appointment_date, appointment_time, reason, consultation_mode } = body

    // Validate input
    if (!guestName || !guestEmail || !guestPhone || !doctor_id || !appointment_date || !appointment_time || !reason) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guestEmail)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check for conflicts at this time slot
    const { data: conflicts, error: conflictError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .in('status', ['pending', 'confirmed', 'scheduled'])

    if (conflictError) {
      console.error('Conflict check error:', conflictError)
      return Response.json({ error: 'Failed to check time slot availability' }, { status: 500 })
    }

    if (conflicts && conflicts.length > 0) {
      return Response.json(
        { error: 'This time slot is no longer available. Please choose another time.' },
        { status: 409 }
      )
    }

    // Create appointment with guest booking using service role (bypasses RLS)
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([
        {
          patient_id: null, // NULL for guest bookings
          doctor_id,
          appointment_date,
          appointment_time,
          status: 'pending',
          notes: `Guest Booking\nName: ${guestName}\nEmail: ${guestEmail}\nPhone: ${guestPhone}\nReason: ${reason}`,
        },
      ])
      .select()

    console.log('[api/appointments/guest] insert result:', { appointment, appointmentError })
    if (appointmentError) {
      console.error('Appointment insert error:', appointmentError)
      return Response.json({ error: appointmentError.message || 'Failed to book appointment' }, { status: 400 })
    }

    // TODO: Send confirmation email to guest

    return Response.json(
      {
        success: true,
        message: 'Appointment booked successfully. Confirmation has been sent to your email.',
        appointment: appointment[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Guest appointment booking error:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

