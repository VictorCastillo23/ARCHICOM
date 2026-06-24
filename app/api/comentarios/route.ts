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
  const { publicacion_id, contenido, responde_a } = body

  if (!publicacion_id || !contenido) {
    return validationError('Se requieren publicacion_id y contenido')
  }

  if (contenido.length > 250) return validationError('El comentario no puede superar 250 caracteres.')

  // Validate and re-parent optional responde_a
  let efectivoRespondeA: string | null = null
  if (responde_a) {
    const { data: padre, error: padreErr } = await supabase
      .from('comentario')
      .select('id, publicacion_id, responde_a')
      .eq('id', responde_a)
      .maybeSingle()

    if (padreErr) return handleError(padreErr)
    if (!padre) return validationError('El comentario al que respondés no existe.')
    if (padre.publicacion_id !== publicacion_id)
      return validationError('No podés responder a un comentario de otra publicación.')

    // Re-parent: if target is itself a reply, anchor to its root (depth-2 invariant)
    efectivoRespondeA = padre.responde_a ?? padre.id
  }

  const { data, error } = await supabase
    .from('comentario')
    .insert({ publicacion_id, contenido, autor_id: user.id, responde_a: efectivoRespondeA })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ comentario: data }, 201)
}
