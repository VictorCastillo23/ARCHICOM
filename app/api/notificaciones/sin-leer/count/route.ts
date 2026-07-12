import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'
import { getTotalNoLeidas } from '@/lib/data/notificaciones'

// Lightweight unread total for the nav bell badge. The client re-fetches this
// on navigation and on Realtime events (the RSC nav lives in the persistent
// layout and does not recompute on client-side route changes).
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: total, error } = await getTotalNoLeidas()
  if (error) return handleError(error)

  return jsonOk({ total })
}
