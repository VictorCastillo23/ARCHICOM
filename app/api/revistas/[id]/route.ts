import { handleError, jsonOk } from '@/lib/supabase/handleError'
import { getRevista } from '@/lib/data/revistas'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import type { EstadoRevista } from '@/lib/types/database'

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

  const { titulo, volumen, descripcion, estado } = body as {
    titulo?: string
    volumen?: number
    descripcion?: string
    estado?: EstadoRevista
  }

  const updateObj: Record<string, unknown> = {}
  if (titulo !== undefined) updateObj.titulo = titulo
  if (volumen !== undefined) updateObj.volumen = volumen
  if (descripcion !== undefined) updateObj.descripcion = descripcion
  if (estado !== undefined) {
    updateObj.estado = estado
    if (estado === 'publicada') {
      updateObj.publicada_en = new Date().toISOString()
    }
  }

  const { data, error } = await admin.supabase
    .from('revista')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ revista: data })
}
