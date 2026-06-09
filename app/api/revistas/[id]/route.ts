import { handleError, jsonOk } from '@/lib/supabase/handleError'
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
