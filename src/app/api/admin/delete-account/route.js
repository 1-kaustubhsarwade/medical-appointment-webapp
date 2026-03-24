import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const serviceClient = await createAdminClient()

    let { data: { user } = {}, error: userErr } = await serviceClient.auth.getUser()

    // Fallback: accept Authorization: Bearer <token> header if cookies don't contain a session
    if (!user && !userErr) {
      const authHeader = request.headers.get('authorization') || ''
      const token = authHeader.replace('Bearer ', '')
      if (token) {
        const res = await serviceClient.auth.getUser(token)
        user = res?.data?.user
        userErr = res?.error
      }
    }

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session token' }), { status: 401 })
    }

    // Ensure user is an admin in users_extended
    const { data: adminRow, error: adminErr } = await serviceClient
      .from('users_extended')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'admin')
      .limit(1)

    if (adminErr) {
      return new Response(JSON.stringify({ error: adminErr.message }), { status: 500 })
    }

    if (!adminRow || adminRow.length === 0) {
      return new Response(JSON.stringify({ error: 'User is not an admin' }), { status: 403 })
    }

    // Delete related records (non-blocking if errors)
    await serviceClient.from('doctors').delete().eq('id', user.id)
    await serviceClient.from('users_extended').delete().eq('id', user.id)

    // Finally delete auth user using service role
    const { error: deleteErr } = await serviceClient.auth.admin.deleteUser(user.id)
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error('[admin/delete-account] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 })
  }
}

