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

export async function DELETE(
  _request: Request,
  ctx: RouteContext
) {
  const { id: seguido_id } = await ctx.params

  if (!seguido_id) {
    return validationError('Se requiere el id del usuario a dejar de seguir')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: deleted, error } = await supabase
    .from('seguidor')
    .delete()
    .eq('seguidor_id', user.id)
    .eq('seguido_id', seguido_id)
    .select('seguido_id')
    .maybeSingle()

  if (error) return handleError(error)

  if (!deleted) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'No segues a este usuario' } },
      { status: 404 }
    )
  }

  return jsonOk(null)
}
