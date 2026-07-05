import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import type { Liker } from '@/lib/types/database'

// Public read: who liked a publicacion. Likes are public (the count is shown to
// anon), so no auth gate. RLS on `like` still applies as the current user/anon.
export async function GET(request: Request) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const publicacion_id = searchParams.get('publicacion_id')

  if (!publicacion_id) {
    return validationError('Se requiere el parámetro publicacion_id')
  }

  const { data, error } = await supabase
    .from('like')
    .select('usuario(id, nombre, institucion)')
    .eq('publicacion_id', publicacion_id)

  if (error) return handleError(error)

  const likers: Liker[] = []
  for (const row of data ?? []) {
    // PostgREST types a to-one embed as an array; the FK guarantees at most one.
    const usuario = (
      Array.isArray(row.usuario) ? row.usuario[0] : row.usuario
    ) as { id: string; nombre: string; institucion: string | null } | null
    if (!usuario) continue
    likers.push({
      id: usuario.id,
      nombre: usuario.nombre,
      institucion: usuario.institucion ?? null,
    })
  }

  // The `like` table has no timestamp column, so sort alphabetically by name.
  likers.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return jsonOk(likers)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const { publicacion_id } = body

  if (!publicacion_id) {
    return validationError('Se requiere publicacion_id')
  }

  const { error } = await supabase
    .from('like')
    .insert({ publicacion_id, usuario_id: user.id })

  if (error) return handleError(error)

  return jsonOk(null, 201)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const publicacion_id = searchParams.get('publicacion_id')

  if (!publicacion_id) {
    return validationError('Se requiere el parámetro publicacion_id')
  }

  const { error } = await supabase
    .from('like')
    .delete()
    .eq('publicacion_id', publicacion_id)
    .eq('usuario_id', user.id)

  if (error) return handleError(error)

  return jsonOk(null)
}
