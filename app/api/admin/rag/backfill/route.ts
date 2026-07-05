import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'
import { indexarPublicacion } from '@/lib/rag/indexer'

export const runtime = 'nodejs'
// The backfill indexes PDFs sequentially; allow it the full function budget.
export const maxDuration = 300

type BackfillRow = { id: string; chunks?: number; error?: string }

// Admin-only: one-off backfill that indexes every not-yet-indexed PDF across
// all authors. Runs under the admin's JWT; the additive admin RLS policies
// (chunk_admin_write / rag_admin_write) authorize the writes — no service_role.
// Idempotent (sha256 per file), safe to re-run.
export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  // Admin gate (defense in depth — the admin RLS policies are the real guard).
  const { data: esAdmin, error: adminError } = await supabase.rpc('es_admin')
  if (adminError) return handleError(adminError)
  if (!esAdmin)
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Solo un administrador puede ejecutar el backfill' } },
      { status: 403 },
    )

  // PDFs with no publicacion_rag row yet.
  const { data: pubs, error: listError } = await supabase
    .from('publicacion')
    .select('id, archivo_url, publicacion_rag(publicacion_id)')
    .ilike('archivo_url', '%.pdf')

  if (listError) return handleError(listError)

  const pendientes = (pubs ?? []).filter((p) => {
    const rag = p.publicacion_rag
    return !rag || (Array.isArray(rag) && rag.length === 0)
  })

  // Sequential: the embed edge worker has a ~2s compute ceiling, so overlapping
  // indexing jobs would trip WORKER_RESOURCE_LIMIT.
  const resultados: BackfillRow[] = []
  for (const p of pendientes) {
    try {
      const r = await indexarPublicacion(supabase, {
        id: p.id,
        archivoUrl: p.archivo_url as string,
      })
      resultados.push({ id: p.id, chunks: r.chunks })
    } catch (error) {
      resultados.push({ id: p.id, error: error instanceof Error ? error.message : 'error' })
    }
  }

  const indexadas = resultados.filter((r) => r.error === undefined).length
  return jsonOk({
    total: pendientes.length,
    indexadas,
    fallidas: resultados.length - indexadas,
    resultados,
  })
}
