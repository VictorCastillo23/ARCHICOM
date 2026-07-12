import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'

// Marks all of the session user's unread notifications as read in one call.
// RLS (`notif_update`) scopes the write to `usuario_id = auth.uid()`; the
// explicit .eq('usuario_id', ...) below is a performance filter, not the
// security boundary.
export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data, error } = await supabase
    .from('notificacion')
    .update({ leida: true, leida_en: new Date().toISOString() })
    .eq('usuario_id', user.id)
    .eq('leida', false)
    .select('id')

  if (error) return handleError(error)

  return jsonOk({ updated: data?.length ?? 0 })
}
