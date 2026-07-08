import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'

type Context = { params: Promise<{ id: string }> }

// Owner check is enforced by RLS (coleccion_publicacion_write: EXISTS coleccion
// WHERE usuario_id = auth.uid()), not duplicated here. A non-owner insert
// attempt is denied by RLS (42501 -> handleError -> 403).
export async function POST(request: Request, ctx: Context) {
  const { id: coleccion_id } = await ctx.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const { publicacion_id } = body as { publicacion_id?: string }

  if (typeof publicacion_id !== 'string' || publicacion_id.length === 0) {
    return validationError('Se requiere publicacion_id')
  }

  const { error } = await supabase
    .from('coleccion_publicacion')
    .insert({ coleccion_id, publicacion_id })

  if (error) return handleError(error)

  return jsonOk(null, 201)
}
