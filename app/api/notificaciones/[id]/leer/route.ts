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

// Marks one notification as read. Only `leida`/`leida_en` are grantable
// columns on `notificacion` (Decision 6, column-scoped UPDATE grant) — this
// is the only mutation the client can perform on the table besides delete.
export async function POST(_request: Request, ctx: RouteContext) {
  const { id } = await ctx.params

  if (!id) {
    return validationError('Se requiere el id de la notificación')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: updated, error } = await supabase
    .from('notificacion')
    .update({ leida: true, leida_en: new Date().toISOString() })
    .eq('id', id)
    .eq('usuario_id', user.id)
    .select('id, leida, leida_en')
    .maybeSingle()

  if (error) return handleError(error)

  if (!updated) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Notificación no encontrada' } },
      { status: 404 }
    )
  }

  return jsonOk(updated)
}
