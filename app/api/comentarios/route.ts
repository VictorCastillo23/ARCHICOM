import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { getComentarios } from '@/lib/data/comentarios'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const publicacion_id = searchParams.get('publicacion_id')

  if (!publicacion_id) {
    return validationError('Se requiere el parámetro publicacion_id')
  }

  const { data, error } = await getComentarios(publicacion_id)
  if (error) return handleError(error)

  return jsonOk({ comentarios: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { publicacion_id, contenido } = body

  if (!publicacion_id || !contenido) {
    return validationError('Se requieren publicacion_id y contenido')
  }

  const { data, error } = await supabase
    .from('comentario')
    .insert({ publicacion_id, contenido, autor_id: user.id })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ comentario: data }, 201)
}
