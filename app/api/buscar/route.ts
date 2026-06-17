import { type NextRequest } from 'next/server'
import { buscarPublicaciones, buscarUsuarios } from '@/lib/data/buscar'
import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'

const TIPOS_BUSQUEDA = ['publicacion', 'usuario'] as const
type TipoBusqueda = (typeof TIPOS_BUSQUEDA)[number]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // --- Validate q ---
  const q = searchParams.get('q')
  if (!q || q.trim().length === 0) {
    return validationError('q is required')
  }
  if (q.trim().length < 2) {
    return validationError('q must be at least 2 characters')
  }

  // --- Validate tipo (optional) ---
  const tipoParam = searchParams.get('tipo')
  if (tipoParam !== null && !TIPOS_BUSQUEDA.includes(tipoParam as TipoBusqueda)) {
    return validationError('tipo inválido')
  }
  const tipo = tipoParam as TipoBusqueda | null

  // --- Clamp offset (mirror /api/publicaciones pattern) ---
  const offsetParam = searchParams.get('offset')
  const offset = offsetParam === null ? 0 : Math.max(Math.trunc(Number(offsetParam)) || 0, 0)

  // --- Autocomplete mode (no tipo) ---
  if (tipo === null) {
    const [pubsResult, usersResult] = await Promise.all([
      buscarPublicaciones(q.trim(), 0),
      buscarUsuarios(q.trim(), 0),
    ])

    if (pubsResult.error) return handleError(pubsResult.error)
    if (usersResult.error) return handleError(usersResult.error)

    return jsonOk({
      publicaciones: pubsResult.items,
      usuarios: usersResult.items,
    })
  }

  // --- Paginated mode (tipo present) ---
  if (tipo === 'publicacion') {
    const result = await buscarPublicaciones(q.trim(), offset)
    if (result.error) return handleError(result.error)
    return jsonOk({ items: result.items, hasMore: result.hasMore })
  }

  // tipo === 'usuario'
  const result = await buscarUsuarios(q.trim(), offset)
  if (result.error) return handleError(result.error)
  return jsonOk({ items: result.items, hasMore: result.hasMore })
}
