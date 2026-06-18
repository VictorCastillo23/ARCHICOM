import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { isHttpsUrl } from '@/lib/validation/url'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { etiqueta, url, orden } = body as {
    etiqueta?: string
    url?: string
    orden?: number
  }

  // Validate fields if present
  if (etiqueta !== undefined) {
    if (!etiqueta.trim()) return validationError('etiqueta no puede estar vacía')
    if (etiqueta.trim().length > 50) return validationError('etiqueta no puede superar 50 caracteres')
  }

  if (url !== undefined && !isHttpsUrl(url)) {
    return validationError('La URL debe comenzar con https://')
  }

  const updates: Record<string, string | number> = {}
  if (etiqueta !== undefined) updates.etiqueta = etiqueta.trim()
  if (url !== undefined) updates.url = url
  if (orden !== undefined) updates.orden = orden

  const { data, error } = await supabase
    .from('usuario_link')
    .update(updates)
    .eq('id', id)
    .select('id, usuario_id, etiqueta, url, orden, creado_en')
    .maybeSingle()

  if (error) return handleError(error)

  // null = row not found or RLS blocked (non-owner) — treat as 403
  if (!data) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Enlace no encontrado o sin permiso' } },
      { status: 403 },
    )
  }

  return jsonOk(data)
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const { data, error } = await supabase
    .from('usuario_link')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return handleError(error)

  // null = row not found or RLS blocked (non-owner) — treat as 403
  if (!data) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Enlace no encontrado o sin permiso' } },
      { status: 403 },
    )
  }

  return jsonOk(null)
}
