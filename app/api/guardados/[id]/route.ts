import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// [id] is the publicacion_id of the saved publication.
export async function DELETE(_request: Request, ctx: RouteContext) {
  const { id: publicacion_id } = await ctx.params

  if (!publicacion_id) {
    return validationError('Se requiere el id de la publicación')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: deleted, error } = await supabase
    .from('guardado')
    .delete()
    .eq('publicacion_id', publicacion_id)
    .eq('usuario_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) return handleError(error)

  if (!deleted) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Este guardado no existe' } },
      { status: 404 }
    )
  }

  return jsonOk(null)
}
