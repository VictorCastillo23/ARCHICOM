import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { conversacion_id } = body

  if (!conversacion_id) {
    return validationError('Se requiere conversacion_id')
  }

  // Mark as read all messages in this conversation NOT sent by the current user.
  // RLS policy mensaje_marca_leido enforces the emisor_id <> auth.uid() constraint
  // on the DB side — the .neq() here is a performance filter (skip already-known rows).
  const { data, error } = await supabase
    .from('mensaje')
    .update({ leido: true })
    .eq('conversacion_id', conversacion_id)
    .neq('emisor_id', user.id)
    .eq('leido', false)
    .select('id')

  if (error) return handleError(error)

  return jsonOk({ updated: data?.length ?? 0 })
}
