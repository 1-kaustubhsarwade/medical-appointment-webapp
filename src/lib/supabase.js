/**
 * SUPABASE CLIENT RE-EXPORT
 * 
 * This file provides a singleton Supabase client instance for backward compatibility.
 * New code should prefer importing from @/lib/supabase/client or @/lib/supabase/server.
 */

import { getSupabaseClient } from '@/lib/supabase/client'

// Export the singleton instance as 'supabase' and also as default
export const supabase = getSupabaseClient()
export default supabase

// Also provide the createClient function if needed
export { createClient } from '@/lib/supabase/client'

