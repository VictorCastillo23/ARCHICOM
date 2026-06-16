import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import { getRevista } from '@/lib/data/revistas'
import { requireAdmin } from '@/lib/auth/requireAdmin'

type Context = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Context) {
  const { id } = await ctx.params

  const { data, error } = await getRevista(id)
  if (error) return handleError(error)

  return jsonOk({ revista: data })
}

export async function PATCH(request: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id } = await ctx.params
  const body = await request.json()

  const { titulo, volumen } = body as {
    titulo?: string
    volumen?: number
  }

  if (titulo !== undefined && titulo.length > 65)
    return validationError('El título no puede superar 65 caracteres.')
  if (volumen !== undefined && volumen >= 9999)
    return validationError('El volumen debe ser menor a 9999.')

  const updateObj: Record<string, unknown> = {}
  if (titulo !== undefined) updateObj.titulo = titulo
  if (volumen !== undefined) updateObj.volumen = volumen

  const { data, error } = await admin.supabase
    .from('revista')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ revista: data })
}

export async function DELETE(_req: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id } = await ctx.params

  const { error } = await admin.supabase.from('revista').delete().eq('id', id)

  if (error) return handleError(error)

  return jsonOk(null)
}
