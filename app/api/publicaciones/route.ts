import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { getFeed } from '@/lib/data/feed'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tipo = searchParams.get('tipo') ?? undefined
  const area = searchParams.get('area') ?? undefined
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10
  const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0

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
