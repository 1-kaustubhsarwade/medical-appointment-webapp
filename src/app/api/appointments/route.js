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
    console.log('[api/appointments] POST body:', body)
    const { patient_id, doctor_id, appointment_date, appointment_time, notes } = body

    // Validate input
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return Response.json(
        { error: 'Missing required fields: patient_id, doctor_id, appointment_date, appointment_time' },
        { status: 400 }
      )
    }

    // Check for conflicts — same doctor, same date, same time slot
    const { data: conflicts, error: conflictError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .in('status', ['pending', 'confirmed'])

    if (conflictError) {
      return Response.json({ error: conflictError.message }, { status: 500 })
    }

    if (conflicts && conflicts.length > 0) {
      return Response.json(
        { error: 'This time slot is already booked. Please choose another time.' },
        { status: 409 }
      )
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([{
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        status: 'pending',
        notes: notes || null,
      }])
      .select()
      .single()

    console.log('[api/appointments] insert result:', { appointment, appointmentError })
    if (appointmentError) {
      return Response.json({ error: appointmentError.message }, { status: 400 })
    }

    return Response.json(
      { success: true, message: 'Appointment booked successfully', appointment },
      { status: 201 }
    )
  } catch (error) {
    console.error('Appointment booking error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')
    const doctorId = searchParams.get('doctor_id')

    if (!patientId && !doctorId) {
      return Response.json({ error: 'Provide either patient_id or doctor_id' }, { status: 400 })
    }

    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true })

    if (patientId) {
      query = query.eq('patient_id', patientId)
    } else if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    const { data: appointments, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ appointments }, { status: 200 })
  } catch (error) {
    console.error('Fetch appointments error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return Response.json({ error: 'Missing required fields: id, status' }, { status: 400 })
    }

    const allowed = ['pending', 'confirmed', 'completed', 'cancelled']
    if (!allowed.includes(status)) {
      return Response.json({ error: `Invalid status. Must be one of: ${allowed.join(', ')}` }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[api/appointments] PATCH error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, appointment: data }, { status: 200 })
  } catch (error) {
    console.error('[api/appointments] PATCH exception:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

