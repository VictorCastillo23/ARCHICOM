import { handleError } from '@/lib/supabase/handleError'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id } = await ctx.params

  const { error } = await admin.supabase.rpc('descartar_reporte', {
    p_reporte_id: id,
  })

  if (error) return handleError(error)

  return new NextResponse(null, { status: 204 })
}
