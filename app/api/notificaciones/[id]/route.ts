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

// Deletes one notification. RLS (`notif_delete`) scopes ownership; the
// explicit .eq('usuario_id', ...) below just lets us tell "not found" apart
// from "not yours" without leaking which (both return 404 either way).
export async function DELETE(_request: Request, ctx: RouteContext) {
  const { id } = await ctx.params

  if (!id) {
    return validationError('Se requiere el id de la notificación')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: deleted, error } = await supabase
    .from('notificacion')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) return handleError(error)

  if (!deleted) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Notificación no encontrada' } },
      { status: 404 }
    )
  }

  return jsonOk(null)
}
