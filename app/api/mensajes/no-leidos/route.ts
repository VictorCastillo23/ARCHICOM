import { createClient } from '@/lib/supabase/server'
import { jsonOk, unauthorized, handleError } from '@/lib/supabase/handleError'
import {
  getTotalNoLeidos,
  getTotalSolicitudesPendientes,
} from '@/lib/data/mensajes'

// Lightweight unread total (unread messages + pending message requests) for the
// nav badge. The client re-fetches this on navigation, since the RSC nav lives in
// the persistent layout and does not recompute on client-side route changes.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const [{ data: noLeidos, error: e1 }, { data: pendientes, error: e2 }] =
    await Promise.all([
      getTotalNoLeidos(),
      getTotalSolicitudesPendientes(user.id),
    ])
  if (e1) return handleError(e1)
  if (e2) return handleError(e2)

  return jsonOk({ total: (noLeidos ?? 0) + (pendientes ?? 0) })
}
