import { supabase } from './supabase'
import { getErrorMessage } from './errorHandler'

// ============ DOCTOR UTILITIES ============

export async function getDoctors() {
  try {
    // Query doctors with all info in one table (no join needed)
    const { data: doctorsData, error: doctorsError } = await supabase
      .from('doctors')
      .select('*')

    if (doctorsError) {
      return { data: null, error: doctorsError }
    }

    return { data: doctorsData || [], error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getDoctorById(doctorId) {
  try {
    // Query doctor - all info is in doctors table now
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single()

    if (doctorError) {
      return { data: null, error: doctorError }
    }

    return { data: doctorData, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}


export async function getSpecializations() {
  try {
    // Fetch all distinct specializations from doctors table
    const { data: doctorsData, error } = await supabase
      .from('doctors')
      .select('specialization')

    if (error) {
      return { data: null, error }
    }

    if (!doctorsData || doctorsData.length === 0) {
      return { data: [], error: null }
    }

    // Extract unique specializations and sort them
    const specializations = Array.from(
      new Set(doctorsData.map(d => d.specialization).filter(Boolean))
    ).sort()

    return { data: specializations, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getDoctorsBySpecialization(specialization) {
  try {
    if (!specialization) {
      return getDoctors()
    }

    // Query doctors filtered by specialization
    const { data: doctorsData, error: doctorsError } = await supabase
      .from('doctors')
      .select('*')
      .eq('specialization', specialization)

    if (doctorsError) {
      return { data: null, error: doctorsError }
    }

    if (!doctorsData || doctorsData.length === 0) {
      return { data: [], error: null }
    }

    // Fetch doctor names from users_extended table
    const doctorIds = doctorsData.map(d => d.id)
    const { data: userExtData, error: userExtError } = await supabase
      .from('users_extended')
      .select('id, full_name')
      .in('id', doctorIds)

    if (userExtError) {
      // Non-critical error - return doctors without names
      return { data: doctorsData, error: null }
    }

    // Merge the data
    const enrichedDoctors = doctorsData.map(doc => {
      const userExt = userExtData?.find(u => u.id === doc.id)
      return {
        ...doc,
        full_name: userExt?.full_name || 'Dr. Unknown'
      }
    })

    return { data: enrichedDoctors, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getDoctorAvailability(doctorId, date) {
  const dayOfWeek = new Date(date).getDay()
  
  const { data: availability, error } = await supabase
    .from('doctor_availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_available', true)

  if (error) return { data: null, error }

  // Get existing appointments for this date
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed'])

  if (apptError) return { data: null, error: apptError }

  // Generate available time slots
  const bookedTimes = appointments.map(a => a.appointment_time)
  const slots = []

  availability.forEach(slot => {
    const [startHour, startMin] = slot.start_time.split(':').map(Number)
    const [endHour, endMin] = slot.end_time.split(':').map(Number)
    const duration = slot.slot_duration_minutes

    let currentTime = new Date(2000, 0, 1, startHour, startMin)
    const endTime = new Date(2000, 0, 1, endHour, endMin)

    while (currentTime < endTime) {
      const timeStr = currentTime.toTimeString().slice(0, 5)
      
      if (!bookedTimes.includes(timeStr)) {
        slots.push({
          time: timeStr,
          available: true
        })
      }

      currentTime.setMinutes(currentTime.getMinutes() + duration)
    }
  })

  return { data: slots, error: null }
}

// ============ APPOINTMENT UTILITIES ============

export async function checkAppointmentConflict(doctorId, appointmentDate, appointmentTime) {
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', appointmentDate)
    .eq('appointment_time', appointmentTime)
    .in('status', ['pending', 'confirmed'])

  return existing && existing.length > 0
}

export async function bookAppointment(patientId, doctorId, appointmentDate, appointmentTime, reason, consultationMode = 'in-person') {
  // Check for conflicts
  const hasConflict = await checkAppointmentConflict(doctorId, appointmentDate, appointmentTime)
  
  if (hasConflict) {
    // Log the conflict
    await supabase
      .from('appointment_conflicts_log')
      .insert({
        doctor_id: doctorId,
        conflicting_appointments: {
          attempted_date: appointmentDate,
          attempted_time: appointmentTime,
          timestamp: new Date().toISOString()
        }
      })

    return { error: 'This time slot is no longer available. Please choose another time.' }
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      reason_for_visit: reason,
      consultation_mode: consultationMode,
      status: 'pending'
    })
    .select()

  return { data, error }
}

export async function getPatientAppointments(patientId) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      doctor:doctor_id(
        id,
        full_name,
        specialization,
        consultation_fee
      )
    `)
    .eq('patient_id', patientId)
    .order('appointment_date', { ascending: true })

  return { data, error }
}

export async function getDoctorAppointments(doctorId) {
  try {
    // Fetch appointments without relying on PostgREST embedded relationships
    const { data: appts, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: true })

    if (error) {
      console.error('[getDoctorAppointments] Query error:', getErrorMessage(error), error)
      return { data: null, error }
    }

    if (!appts || appts.length === 0) {
      console.log('[getDoctorAppointments] No appointments found for doctor:', doctorId)
      return { data: [], error: null }
    }

    // Collect patient IDs and fetch their extended profiles
    const patientIds = Array.from(new Set(appts.map(a => a.patient_id).filter(Boolean)))
    let userExtData = []
    if (patientIds.length > 0) {
      const { data: uData, error: uErr } = await supabase
        .from('users_extended')
        .select('id, full_name, phone')
        .in('id', patientIds)

      if (uErr) {
        console.warn('[getDoctorAppointments] Could not fetch users_extended for patients:', getErrorMessage(uErr))
      } else {
        userExtData = uData || []
      }
    }

    const userMap = userExtData.reduce((acc, u) => {
      acc[u.id] = u
      return acc
    }, {})

    const enriched = appts.map(a => ({
      ...a,
      patient: {
        id: a.patient_id,
        users_extended: userMap[a.patient_id] || null
      }
    }))

    console.log('[getDoctorAppointments] Fetched appointments for doctor:', doctorId, 'Count:', enriched.length)
    return { data: enriched, error: null }
  } catch (err) {
    console.error('[getDoctorAppointments] Exception:', err)
    return { data: null, error: err }
  }
}

export async function updateAppointmentStatus(appointmentId, status) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select()

  return { data, error }
}

export async function cancelAppointment(appointmentId) {
  return updateAppointmentStatus(appointmentId, 'cancelled')
}

// ============ USER UTILITIES ============

export async function createUserProfile(userId, fullName, role, phone = null) {
  const { data, error } = await supabase
    .from('users_extended')
    .insert({
      id: userId,
      full_name: fullName,
      role,
      phone
    })
    .select()

  return { data, error }
}

export async function createDoctorProfile(userId, specialization, licenseNumber, experienceYears = 0) {
  const { data, error } = await supabase
    .from('doctors')
    .insert({
      id: userId,
      specialization,
      license_number: licenseNumber,
      experience_years: experienceYears
    })
    .select()

  return { data, error }
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users_extended')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}

// ============ ADMIN UTILITIES ============

export async function getAllAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      doctor:doctor_id(
        users_extended:id(full_name)
      ),
      patient:patient_id(
        users_extended:id(full_name, phone)
      )
    `)
    .order('appointment_date', { ascending: true })

  return { data, error }
}

export async function getConflictLogs() {
  const { data, error } = await supabase
    .from('appointment_conflicts_log')
    .select('*')
    .order('attempted_at', { ascending: false })

  return { data, error }
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users_extended')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function getAdminUser() {
  try {
    const { data, error } = await supabase
      .from('users_extended')
      .select('*')
      .eq('role', 'admin')
      .limit(1)

    if (error) return { data: null, error }
    if (!data || data.length === 0) return { data: null, error: null }

    return { data: data[0], error: null }
  } catch (err) {
    // If the `role` column doesn't exist in users_extended, treat as "unknown" rather than erroring.
    const msg = getErrorMessage(err)
    if (String(msg).toLowerCase().includes('role') && String(msg).toLowerCase().includes('does not exist')) {
      console.warn('[getAdminUser] role column missing in users_extended; cannot determine admin user from DB')
      return { data: null, error: null }
    }
    return { data: null, error: err }
  }
}

