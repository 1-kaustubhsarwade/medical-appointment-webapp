import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Create privileged client using service role key
    const supabase = await createAdminClient()

    // Try admin API to list users and find one with metadata.role === 'admin'
    // NOTE: this requires SUPABASE_SERVICE_ROLE_KEY to be set in environment
    if (!supabase.auth?.admin || typeof supabase.auth.admin.listUsers !== 'function') {
      // As a fallback, attempt to query users_extended table for role='admin'
      const { data, error } = await supabase.from('users_extended').select('id, full_name').eq('role', 'admin').limit(1)
      if (error) return NextResponse.json({ data: null, error: error.message }, { status: 200 })
      if (data && data.length > 0) return NextResponse.json({ data: data[0] })
      return NextResponse.json({ data: null })
    }

    const list = await supabase.auth.admin.listUsers()
    const users = list?.data?.users || list?.users || []
    const adminUser = users.find(u => u.user_metadata?.role === 'admin')

    if (adminUser) {
      return NextResponse.json({ data: { id: adminUser.id, email: adminUser.email } })
    }

    // No admin found
    return NextResponse.json({ data: null })
  } catch (err) {
    // If service key missing or other error, return null but include message
    return NextResponse.json({ data: null, error: String(err) }, { status: 200 })
  }
}

