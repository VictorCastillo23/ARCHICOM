import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk } from '@/lib/supabase/handleError'

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) return handleError(error)

  return jsonOk(null)
}
