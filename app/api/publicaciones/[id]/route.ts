import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { getPublicacion } from '@/lib/data/publicaciones'
import { removeOwnStorageObject } from '@/lib/supabase/storage'
import { isHttpUrl } from '@/lib/validation/url'
import type { TipoPublicacion } from '@/lib/types/database'
import { TIPOS_PUBLICACION } from '@/lib/constants/publicaciones'

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

  const body = await request.json().catch(() => ({}))
  const { titulo, resumen, tipo, archivo_url, archivo_thumbnail_url, obra_autor_externo, url_externa, chat_habilitado } = body as {
    titulo?: string
    resumen?: string
    tipo?: string
    archivo_url?: string
    archivo_thumbnail_url?: string | null
    obra_autor_externo?: string | null
    url_externa?: string | null
    chat_habilitado?: boolean
  }

  if (titulo !== undefined && (typeof titulo !== 'string' || titulo.length > 150))
    return validationError('El título no puede superar 150 caracteres.')
  if (resumen !== undefined && (typeof resumen !== 'string' || resumen.length > 700))
    return validationError('El resumen no puede superar 700 caracteres.')

  if (tipo !== undefined && !TIPOS_PUBLICACION.includes(tipo as TipoPublicacion)) {
    return validationError('tipo inválido')
  }

  if (chat_habilitado !== undefined && typeof chat_habilitado !== 'boolean') {
    return validationError('chat_habilitado debe ser boolean')
  }

  // Empty string is not a valid url_externa — use null to clear it (aligns with POST).
  if (url_externa !== undefined && url_externa !== null) {
    if (url_externa === '' || !isHttpUrl(url_externa)) {
      return validationError('url_externa debe ser una URL http(s) válida')
    }
  }

  if (obra_autor_externo !== undefined && obra_autor_externo !== null && obra_autor_externo.trim() === '') {
    return validationError('obra_autor_externo no puede ser una cadena vacía')
  }

  // Attribution fields only belong to recomendacion. Resolve the effective tipo
  // (the one being set, or the row's current tipo) before allowing non-null values.
  const settingAttribution =
    (obra_autor_externo !== undefined && obra_autor_externo !== null) ||
    (url_externa !== undefined && url_externa !== null)

  if (settingAttribution) {
    let effectiveTipo: string | undefined = tipo
    if (effectiveTipo === undefined) {
      const { data: current, error: fetchError } = await supabase
        .from('publicacion')
        .select('tipo')
        .eq('id', id)
        .maybeSingle()
      if (fetchError) return handleError(fetchError)
      if (!current)
        return NextResponse.json(
          { error: { code: 'not_found', message: 'Publicación no encontrada' } },
          { status: 404 },
        )
      effectiveTipo = current.tipo
    }
    if (effectiveTipo !== 'recomendacion') {
      return validationError(
        'obra_autor_externo y url_externa solo aplican a publicaciones de tipo recomendacion',
      )
    }
  }

  const updates: Record<string, string | boolean | null | undefined> = {}
  if (titulo !== undefined) updates.titulo = titulo
  if (resumen !== undefined) updates.resumen = resumen
  if (tipo !== undefined) updates.tipo = tipo
  if (archivo_url !== undefined) updates.archivo_url = archivo_url
  if (archivo_thumbnail_url !== undefined) updates.archivo_thumbnail_url = archivo_thumbnail_url
  if (obra_autor_externo !== undefined) updates.obra_autor_externo = obra_autor_externo
  if (url_externa !== undefined) updates.url_externa = url_externa
  if (chat_habilitado !== undefined) updates.chat_habilitado = chat_habilitado

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

  // Read the file URLs before deleting the row, to clean up Storage afterwards.
  const { data: current } = await supabase
    .from('publicacion')
    .select('archivo_url, archivo_thumbnail_url')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('publicacion')
    .delete()
    .eq('id', id)

  if (error) return handleError(error)

  // Best-effort Storage cleanup. Works under the author's JWT; a non-author admin
  // can't remove the file (bucket RLS is folder-scoped, no service_role) → it stays
  // orphaned (known limitation). Never fails the delete.
  if (current?.archivo_url) await removeOwnStorageObject(supabase, current.archivo_url)
  if (current?.archivo_thumbnail_url) await removeOwnStorageObject(supabase, current.archivo_thumbnail_url)

  return jsonOk(null)
}
