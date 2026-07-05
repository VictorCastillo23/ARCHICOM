import { createClient } from '@/lib/supabase/server'
import { embedTexts } from '@/lib/rag/embed'
import {
  RRF_K,
  SEARCH_FTS_TOP_K,
  SEARCH_HYBRID_PAGE,
  SEARCH_SEMANTIC_TOP_K,
} from '@/lib/rag/config'
import type { PublicacionCardData, UsuarioCardData } from '@/lib/types/database'

/** Row shape returned by the `buscar_publicaciones` RPC (Spanish FTS). */
type BuscarPublicacionRow = {
  id: string
  titulo: string
  resumen: string | null
  tipo: PublicacionCardData['tipo']
  autor_id: string
  creado_en: string
  nombre_autor: string | null
  total: number
}

/** Maps an FTS row to the card DTO. */
function ftsRowToCard(row: BuscarPublicacionRow): PublicacionCardData {
  return {
    id: row.id,
    titulo: row.titulo,
    resumen: row.resumen ?? '',
    tipo: row.tipo,
    nombre_autor: row.nombre_autor ?? '',
    autor_id: row.autor_id,
    creado_en: row.creado_en,
  }
}

export async function buscarPublicaciones(
  q: string,
  offset = 0,
  limit = 6
): Promise<{ items: PublicacionCardData[]; hasMore: boolean; error: unknown }> {
  const supabase = await createClient()

  // Ranked full-text search (Spanish stemming + prefix). The RPC sanitizes the
  // query and builds the prefix tsquery internally; it runs SECURITY INVOKER so
  // RLS on `publicacion` (incl. the bloqueada filter) applies as this caller.
  const { data, error } = await supabase.rpc('buscar_publicaciones', {
    p_q: q,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    return { items: [], hasMore: false, error }
  }

  const rows = (data ?? []) as BuscarPublicacionRow[]
  const items = rows.map(ftsRowToCard)

  // The RPC returns the pre-pagination match count on every row via count(*) over().
  const total = rows[0]?.total ?? 0
  const hasMore = total > offset + items.length

  return { items, hasMore, error: null }
}

type SemanticMatch = { publicacion_id: string; similaridad: number }

/**
 * Hybrid search for the /buscar results page: fuses the lexical FTS ranking with
 * a semantic (vector) ranking via Reciprocal Rank Fusion. Semantic recall only
 * covers indexed PDFs, so it AUGMENTS the FTS backbone, never replaces it.
 *
 * Semantic is a logged-in enhancement (the `embed` edge requires a JWT). For
 * anonymous visitors — and if embedding/vector search fails — it degrades to
 * pure FTS. Only the first page is hybrid-ranked; VerMas paginates via FTS.
 */
export async function buscarPublicacionesHibrido(
  q: string,
  limit = SEARCH_HYBRID_PAGE
): Promise<{ items: PublicacionCardData[]; hasMore: boolean; error: unknown }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Anonymous → lexical only (same FTS path, hybrid-sized first page).
  if (!user) return buscarPublicaciones(q, 0, limit)

  const ftsPromise = supabase.rpc('buscar_publicaciones', {
    p_q: q,
    p_limit: SEARCH_FTS_TOP_K,
    p_offset: 0,
  })

  const semanticPromise = (async (): Promise<SemanticMatch[]> => {
    const [embedding] = await embedTexts(supabase, [q])
    if (!embedding) return []
    const { data, error } = await supabase.rpc('match_publicacion_chunks_global', {
      // Same pgvector text-form serialization as the index/chat routes.
      p_query_embedding: JSON.stringify(embedding),
      p_match_count: SEARCH_SEMANTIC_TOP_K,
    })
    if (error) throw error
    return (data ?? []) as SemanticMatch[]
  })()

  const [ftsRes, semRes] = await Promise.allSettled([ftsPromise, semanticPromise])

  // FTS is the backbone — if it failed, surface the error.
  if (ftsRes.status === 'rejected') {
    return { items: [], hasMore: false, error: ftsRes.reason }
  }
  if (ftsRes.value.error) {
    return { items: [], hasMore: false, error: ftsRes.value.error }
  }

  const ftsRows = (ftsRes.value.data ?? []) as BuscarPublicacionRow[]
  const ftsTotal = ftsRows[0]?.total ?? 0
  // Semantic is best-effort: on failure, fall through to pure FTS ranking.
  const semRows = semRes.status === 'fulfilled' ? semRes.value : []

  // --- Reciprocal Rank Fusion over the two ranked id lists ---
  const score = new Map<string, number>()
  ftsRows.forEach((row, i) => {
    score.set(row.id, (score.get(row.id) ?? 0) + 1 / (RRF_K + i + 1))
  })
  semRows.forEach((row, i) => {
    const id = row.publicacion_id
    score.set(id, (score.get(id) ?? 0) + 1 / (RRF_K + i + 1))
  })

  const rankedIds = [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  // Card data: FTS rows already carry it; fetch cards for semantic-only ids.
  const cardById = new Map<string, PublicacionCardData>()
  for (const row of ftsRows) cardById.set(row.id, ftsRowToCard(row))

  const faltantes = rankedIds.filter((id) => !cardById.has(id))
  if (faltantes.length > 0) {
    const { data, error } = await supabase
      .from('publicacion')
      .select('id, titulo, resumen, tipo, autor_id, creado_en, autor:usuario(nombre)')
      .in('id', faltantes)

    // If this fetch fails, those ids just drop from the page (FTS still shows).
    if (!error) {
      for (const row of data ?? []) {
        // supabase-js types embedded relations as array; at runtime it's an
        // object when the FK is unambiguous. Cast through unknown to handle both.
        const autorRaw = row.autor as unknown
        const autor = Array.isArray(autorRaw)
          ? (autorRaw[0] as { nombre: string } | undefined)
          : (autorRaw as { nombre: string } | null)
        cardById.set(row.id as string, {
          id: row.id as string,
          titulo: row.titulo as string,
          resumen: (row.resumen as string | null) ?? '',
          tipo: row.tipo,
          nombre_autor: autor?.nombre ?? '',
          autor_id: row.autor_id as string,
          creado_en: row.creado_en as string,
        })
      }
    }
  }

  const items = rankedIds
    .map((id) => cardById.get(id))
    .filter((c): c is PublicacionCardData => Boolean(c))

  // First page is hybrid; VerMas continues via FTS pagination.
  const hasMore = ftsTotal > limit

  return { items, hasMore, error: null }
}

/** Row shape returned by the `buscar_usuarios` RPC (trigram name search). */
type BuscarUsuarioRow = {
  id: string
  nombre: string
  institucion: string | null
  carrera: string | null
  total: number
}

export async function buscarUsuarios(
  q: string,
  offset = 0,
  limit = 6
): Promise<{ items: UsuarioCardData[]; hasMore: boolean; error: unknown }> {
  const supabase = await createClient()

  // Accent-insensitive, typo-tolerant name search: substring match OR trigram
  // word_similarity, ranked by similarity. The RPC normalizes the query (unaccent
  // + lower) internally; SECURITY INVOKER so `usuario` RLS applies. It only
  // exposes id/nombre/institucion/carrera (never rol/email).
  const { data, error } = await supabase.rpc('buscar_usuarios', {
    p_q: q,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    return { items: [], hasMore: false, error }
  }

  const rows = (data ?? []) as BuscarUsuarioRow[]
  const items: UsuarioCardData[] = rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    institucion: row.institucion ?? undefined,
    carrera: row.carrera ?? undefined,
  }))

  const total = rows[0]?.total ?? 0
  const hasMore = total > offset + items.length

  return { items, hasMore, error: null }
}
