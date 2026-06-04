import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'
import { getPublicacion } from '@/lib/data/publicaciones'

type Context = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const { data, error } = await getPublicacion(id)
  if (error) return handleError(error)

  return jsonOk({ publicacion: data })
}

export async function PATCH(request: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { titulo, resumen, tipo, archivo_url } = body as {
    titulo?: string
    resumen?: string
    tipo?: string
    archivo_url?: string
  }

  const updates: Record<string, string | undefined> = {}
  if (titulo !== undefined) updates.titulo = titulo
  if (resumen !== undefined) updates.resumen = resumen
  if (tipo !== undefined) updates.tipo = tipo
  if (archivo_url !== undefined) updates.archivo_url = archivo_url

  const { data, error } = await supabase
    .from('publicacion')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return handleError(error)
  if (!data)
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Publicación no encontrada' } },
      { status: 404 },
    )

  return jsonOk({ publicacion: data })
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const { error } = await supabase
    .from('publicacion')
    .delete()
    .eq('id', id)

  if (error) return handleError(error)

  return jsonOk(null)
}
