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
  const { publicacion_id } = body

  if (!publicacion_id) {
    return validationError('Se requiere publicacion_id')
  }

  const { error } = await supabase
    .from('guardado')
    .insert({ publicacion_id, usuario_id: user.id })

  if (error) return handleError(error)

  return jsonOk(null, 201)
}
