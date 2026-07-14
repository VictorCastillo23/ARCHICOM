import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { getFeed } from '@/lib/data/feed'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'
import { isHttpUrl } from '@/lib/validation/url'
import type { TipoPublicacion } from '@/lib/types/database'
import { TIPOS_PUBLICACION } from '@/lib/constants/publicaciones'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tipo = searchParams.get('tipo') ?? undefined
  const area = searchParams.get('area') ?? undefined

  // Clamp pagination: reject NaN/negative/oversized values to avoid
  // unbounded scans and NaN propagating into PostgREST .range().
  const MAX_LIMIT = 50
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const limit =
    limitParam === null
      ? 10
      : Math.min(Math.max(Math.trunc(Number(limitParam)) || 10, 1), MAX_LIMIT)
  const offset =
    offsetParam === null
      ? 0
      : Math.max(Math.trunc(Number(offsetParam)) || 0, 0)

  if (area) {
    const { data, error } = await getPublicacionPorArea({ area, limit, offset })
    if (error) return handleError(error)
    return jsonOk({ publicaciones: data })
  }

  const { data, error } = await getFeed({ tipo, limit, offset })
  if (error) return handleError(error)
  return jsonOk({ publicaciones: data })
}

export async function POST(request: NextRequest) {
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
    archivo_thumbnail_url?: string
    obra_autor_externo?: string
    url_externa?: string
    chat_habilitado?: boolean
  }

  if (!titulo || typeof titulo !== 'string' || !resumen || typeof resumen !== 'string' || !tipo) {
    return validationError('titulo, resumen y tipo son requeridos')
  }

  if (titulo.length > 150) return validationError('El título no puede superar 150 caracteres.')
  if (resumen.length > 700) return validationError('El resumen no puede superar 700 caracteres.')

  if (!TIPOS_PUBLICACION.includes(tipo as TipoPublicacion)) {
    return validationError('tipo inválido')
  }

  if (chat_habilitado !== undefined && typeof chat_habilitado !== 'boolean') {
    return validationError('chat_habilitado debe ser boolean')
  }

  const urlExterna = url_externa?.trim()

  if (tipo === 'recomendacion') {
    if (!obra_autor_externo || !obra_autor_externo.trim()) {
      return validationError('obra_autor_externo es requerido para recomendaciones')
    }
    if (!urlExterna || !isHttpUrl(urlExterna)) {
      return validationError('url_externa debe ser una URL http(s) válida')
    }
  } else {
    // Normal publication: a link is allowed on any type, and at least one of
    // {archivo_url, url_externa} is required so the publication has content.
    if (urlExterna && !isHttpUrl(urlExterna)) {
      return validationError('url_externa debe ser una URL http(s) válida')
    }
    if (!archivo_url && !urlExterna) {
      return validationError('Agrega un archivo o un enlace (al menos uno).')
    }
  }

  const { data, error } = await supabase
    .from('publicacion')
    .insert({
      titulo,
      resumen,
      tipo,
      archivo_url,
      ...(archivo_thumbnail_url ? { archivo_thumbnail_url } : {}),
      ...(chat_habilitado !== undefined ? { chat_habilitado } : {}),
      autor_id: user.id,
      ...(urlExterna ? { url_externa: urlExterna } : {}),
      ...(tipo === 'recomendacion' ? { obra_autor_externo } : {}),
    })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ publicacion: data }, 201)
}
