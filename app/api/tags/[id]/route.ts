import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id } = await ctx.params
  const body = await request.json()
  const { nombre, area } = body as { nombre?: string; area?: string }

  if (!nombre && !area) return validationError('Se requiere al menos nombre o area')

  const updateObj: Record<string, string> = {}
  if (nombre !== undefined) updateObj.nombre = nombre
  if (area !== undefined) updateObj.area = area

  const { data, error } = await admin.supabase
    .from('tag')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ tag: data })
}

export async function DELETE(_req: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id } = await ctx.params

  const { error } = await admin.supabase.from('tag').delete().eq('id', id)

  if (error) return handleError(error)

  return new NextResponse(null, { status: 204 })
}
