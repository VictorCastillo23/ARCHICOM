import { createClient } from '@/lib/supabase/server'
import type { PublicacionCardData, UsuarioCardData } from '@/lib/types/database'

/**
 * Defangs ilike metacharacters by replacing them with a space.
 * PostgREST's .ilike() sends the pattern verbatim — there is no portable
 * ESCAPE clause via supabase-js, so we replace rather than backslash-escape.
 *
 * Replaced chars:
 *   %  _   — SQL LIKE wildcards
 *   *       — PostgREST ilike wildcard alias
 *   , ( ) . : — PostgREST filter / embedded-resource syntax
 */
export function sanitizeIlike(q: string): string {
  return q
    .replace(/[%_]/g, ' ')      // SQL LIKE wildcards → space
    .replace(/[*]/g, ' ')       // PostgREST ilike wildcard alias → space
    .replace(/[,().:]/g, ' ')   // PostgREST filter/embedded-resource syntax → space
    .replace(/\s+/g, ' ')       // collapse runs of whitespace introduced above
    .trim()
}

export async function buscarPublicaciones(
  q: string,
  offset = 0,
  limit = 6
): Promise<{ items: PublicacionCardData[]; hasMore: boolean; error: unknown }> {
  const sanitized = sanitizeIlike(q)

  if (!sanitized) {
    return { items: [], hasMore: false, error: null }
  }

  const supabase = await createClient()
  const pattern = `%${sanitized}%`

  const { data, count, error } = await supabase
    .from('publicacion')
    .select('id, titulo, resumen, tipo, autor_id, creado_en, autor:usuario(nombre)', { count: 'exact' })
    .ilike('titulo', pattern)
    .order('creado_en', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return { items: [], hasMore: false, error }
  }

  const rows = data ?? []
  const items: PublicacionCardData[] = rows.map((row) => {
    // supabase-js types embedded relations as array; at runtime it is an object
    // when the FK is unambiguous (one row). Cast through unknown to handle this.
    const autorRaw = row.autor as unknown
    const autor = Array.isArray(autorRaw)
      ? (autorRaw[0] as { nombre: string } | undefined)
      : (autorRaw as { nombre: string } | null)
    return {
      id: row.id as string,
      titulo: row.titulo as string,
      resumen: (row.resumen as string | null) ?? '',
      tipo: row.tipo,
      nombre_autor: autor?.nombre ?? '',
      autor_id: row.autor_id as string,
      creado_en: row.creado_en as string,
    }
  })

  const hasMore = (count ?? 0) > offset + items.length

  return { items, hasMore, error: null }
}

export async function buscarUsuarios(
  q: string,
  offset = 0,
  limit = 6
): Promise<{ items: UsuarioCardData[]; hasMore: boolean; error: unknown }> {
  const sanitized = sanitizeIlike(q)

  if (!sanitized) {
    return { items: [], hasMore: false, error: null }
  }

  const supabase = await createClient()
  const pattern = `%${sanitized}%`

  const { data, count, error } = await supabase
    .from('usuario')
    .select('id, nombre, institucion, carrera', { count: 'exact' })
    .ilike('nombre', pattern)
    .order('nombre')
    .range(offset, offset + limit - 1)

  if (error) {
    return { items: [], hasMore: false, error }
  }

  const rows = data ?? []
  const items: UsuarioCardData[] = rows.map((row) => ({
    id: row.id as string,
    nombre: row.nombre as string,
    institucion: (row.institucion as string | null) ?? undefined,
    carrera: (row.carrera as string | null) ?? undefined,
  }))

  const hasMore = (count ?? 0) > offset + items.length

  return { items, hasMore, error: null }
}
