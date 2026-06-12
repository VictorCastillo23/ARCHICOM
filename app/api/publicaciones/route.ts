import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { getFeed } from '@/lib/data/feed'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'

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

  const body = await request.json()
  const { titulo, resumen, tipo, archivo_url } = body as {
    titulo?: string
    resumen?: string
    tipo?: string
    archivo_url?: string
  }

  if (!titulo || !resumen || !tipo) {
    return validationError('titulo, resumen y tipo son requeridos')
  }

  if (titulo.length > 150) return validationError('El título no puede superar 150 caracteres.')
  if (resumen.length > 250) return validationError('El resumen no puede superar 250 caracteres.')

  const { data, error } = await supabase
    .from('publicacion')
    .insert({
      titulo,
      resumen,
      tipo,
      archivo_url,
      autor_id: user.id,
    })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ publicacion: data }, 201)
}
