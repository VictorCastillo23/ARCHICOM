import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id: revista_id } = await ctx.params
  const body = await request.json()
  const { publicacion_id, orden } = body

  if (!publicacion_id) return validationError('Se requiere publicacion_id')

  const { data, error } = await admin.supabase
    .from('revista_articulo')
    .insert({
      revista_id,
      publicacion_id,
      orden: orden ?? null,
    })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ articulo: data }, 201)
}

export async function PATCH(request: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id: revista_id } = await ctx.params
  const body = await request.json()
  const { articulos } = body as {
    articulos: Array<{ publicacion_id: string; orden: number }>
  }

  if (!Array.isArray(articulos) || articulos.length === 0) {
    return validationError('Se requiere un array de articulos con publicacion_id y orden')
  }

  for (const item of articulos) {
    const { error } = await admin.supabase
      .from('revista_articulo')
      .update({ orden: item.orden })
      .eq('revista_id', revista_id)
      .eq('publicacion_id', item.publicacion_id)

    if (error) return handleError(error)
  }

  const { data, error } = await admin.supabase
    .from('revista_articulo')
    .select('*, publicacion(*, usuario(id, nombre))')
    .eq('revista_id', revista_id)
    .order('orden', { ascending: true })

  if (error) return handleError(error)

  return jsonOk({ articulos: data })
}

export async function DELETE(request: Request, ctx: Context) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id: revista_id } = await ctx.params
  const { searchParams } = new URL(request.url)
  const publicacion_id = searchParams.get('publicacion_id')

  if (!publicacion_id) return validationError('Se requiere publicacion_id como query param')

  const body = await request.json().catch(() => ({}))
  const motivo: string | null = body?.motivo ?? null

  // Atomic: remove the curated article AND mark the solicitud as 'retirada' in
  // one transaction (RPC). Two separate statements could leave inconsistent
  // state if the second failed.
  const { error } = await admin.supabase.rpc('retirar_articulo', {
    p_revista_id: revista_id,
    p_publicacion_id: publicacion_id,
    p_motivo: motivo,
  })

  if (error) return handleError(error)

  return new NextResponse(null, { status: 204 })
}
