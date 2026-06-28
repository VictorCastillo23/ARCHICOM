import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { getMensajes } from '@/lib/data/mensajes'

const MAX_LIMIT = 50

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const { receptor_id, contenido } = body

  if (!receptor_id) {
    return validationError('Se requiere receptor_id')
  }
  if (receptor_id === user.id) {
    return validationError('No puedes enviarte un mensaje a ti mismo')
  }
  if (!contenido || typeof contenido !== 'string') {
    return validationError('Se requiere contenido')
  }
  if (contenido.length < 1 || contenido.length > 2000) {
    return validationError('El mensaje debe tener entre 1 y 2000 caracteres')
  }

  const { data: mensaje, error } = await supabase
    .rpc('enviar_mensaje', { p_receptor_id: receptor_id, p_contenido: contenido })
    .single()

  if (error) return handleError(error)

  return jsonOk({ mensaje }, 201)
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const conversacion_id = searchParams.get('conversacion_id')

  if (!conversacion_id) {
    return validationError('Se requiere el parámetro conversacion_id')
  }

  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, MAX_LIMIT)
  const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset

  const { data: mensajes, error } = await getMensajes(conversacion_id, { limit, offset })

  if (error) return handleError(error)

  return jsonOk({ mensajes: mensajes ?? [] })
}
