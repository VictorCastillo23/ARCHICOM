import { createClient } from '@/lib/supabase/server'
import { handleError, unauthorized } from '@/lib/supabase/handleError'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Context) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await ctx.params

  const { error } = await supabase.rpc('rechazar_solicitud_mensaje', {
    p_solicitud_id: id,
  })

  if (error) return handleError(error)

  return new NextResponse(null, { status: 204 })
}
