import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Fall back to anon key if no service key (public doctors table)
const supabaseKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * GET /api/doctors
 * Returns all doctors or filtered by specialization.
 * Query params:
 *   ?specialization=General+Practitioner  — filter by specialization
 *   (none)                                 — return all doctors
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const specialization = searchParams.get('specialization')

    let query = supabase
      .from('doctors')
      .select('id, full_name, specialization, degree, experience_years, consultation_fee')
      .order('full_name', { ascending: true })

    if (specialization) {
      query = query.eq('specialization', specialization)
    }

    const { data, error } = await query

    if (error) {
      console.error('[api/doctors] query error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ doctors: data || [] }, { status: 200 })
  } catch (err) {
    console.error('[api/doctors] unexpected error:', err)
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/doctors/specializations
 * Returns unique specializations from the doctors table.
 */
export async function POST(request) {
  // POST /api/doctors with body { action: 'specializations' }
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('specialization')

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    const unique = Array.from(
      new Set((data || []).map(d => d.specialization).filter(Boolean))
    ).sort()

    return Response.json({ specializations: unique }, { status: 200 })
  } catch (err) {
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
