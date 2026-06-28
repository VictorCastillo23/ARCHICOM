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

  const body = await request.json().catch(() => ({}))
  const { receptor_id } = body

  if (!receptor_id) {
    return validationError('Se requiere receptor_id')
  }
  if (receptor_id === user.id) {
    return validationError('No puedes enviarte una solicitud a ti mismo')
  }

  const { data, error } = await supabase.rpc('enviar_solicitud_mensaje', {
    p_receptor_id: receptor_id,
  })

  if (error) return handleError(error)

  return jsonOk(data, 201)
}
