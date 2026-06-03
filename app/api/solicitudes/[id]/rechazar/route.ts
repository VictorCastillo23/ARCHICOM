import { handleError } from '@/lib/supabase/handleError'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const respuesta = body?.respuesta ?? null

  const { error } = await admin.supabase.rpc('rechazar_solicitud', {
    p_solicitud_id: id,
    p_respuesta: respuesta,
  })

  if (error) return handleError(error)

  return new NextResponse(null, { status: 204 })
}
