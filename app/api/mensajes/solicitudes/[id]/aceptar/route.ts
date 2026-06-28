import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
} from '@/lib/supabase/handleError'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Context) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await ctx.params

  const { data, error } = await supabase.rpc('aceptar_solicitud_mensaje', {
    p_solicitud_id: id,
  })

  if (error) return handleError(error)

  return jsonOk(data)
}
