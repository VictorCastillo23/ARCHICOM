import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
} from '@/lib/supabase/handleError'
import { getConversaciones } from '@/lib/data/mensajes'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data, error } = await getConversaciones(user.id)

  if (error) return handleError(error)

  return jsonOk({ conversaciones: data ?? [] })
}
