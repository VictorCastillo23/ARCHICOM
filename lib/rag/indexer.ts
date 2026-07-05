import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getStoragePathFromPublicUrl, PUBLICACIONES_BUCKET } from '@/lib/supabase/storage'
import { chunkText, extractPdfText } from '@/lib/rag/pdf'
import { embedTexts } from '@/lib/rag/embed'

export type IndexResult = { chunks: number; reindexado: boolean }

/**
 * Core RAG indexing pipeline for one publication's PDF: download → extract →
 * chunk → embed → persist (delete-then-insert chunks + upsert publicacion_rag).
 * Idempotent across re-runs via a sha256 fingerprint of the file bytes.
 *
 * Runs under the caller's JWT — RLS decides whether the write is allowed: the
 * author (chunk_insert / rag_write) or an admin (chunk_admin_write /
 * rag_admin_write, used by the backfill route). No service_role.
 *
 * Assumes `archivoUrl` is a PDF whose path resolves in the publicaciones bucket
 * (callers validate the .pdf extension). Throws on download/parse/persist
 * errors; callers map them to the API envelope via handleError.
 */
export async function indexarPublicacion(
  supabase: SupabaseClient,
  { id, archivoUrl }: { id: string; archivoUrl: string },
): Promise<IndexResult> {
  const path = getStoragePathFromPublicUrl(archivoUrl)
  if (!path) throw new Error('No se pudo resolver la ruta del archivo en Storage')

  const { data: blob, error: downloadError } = await supabase.storage
    .from(PUBLICACIONES_BUCKET)
    .download(path)
  if (downloadError) throw downloadError

  const bytes = new Uint8Array(await blob.arrayBuffer())
  const hash = createHash('sha256').update(bytes).digest('hex')

  const { data: existingRag, error: ragFetchError } = await supabase
    .from('publicacion_rag')
    .select('archivo_hash, chunks')
    .eq('publicacion_id', id)
    .maybeSingle()
  if (ragFetchError) throw ragFetchError

  // Idempotency: same file bytes and already has chunks → skip re-indexing.
  if (existingRag && existingRag.archivo_hash === hash && existingRag.chunks > 0) {
    return { chunks: existingRag.chunks, reindexado: false }
  }

  const texto = await extractPdfText(bytes)
  const chunks = chunkText(texto)

  // Scanned/empty PDF (no extractable text layer): no chunks, but still mark the
  // publication as processed so we don't retry it every time.
  if (chunks.length === 0) {
    const { error } = await supabase.from('publicacion_rag').upsert(
      {
        publicacion_id: id,
        archivo_hash: hash,
        chunks: 0,
        indexado_en: new Date().toISOString(),
      },
      { onConflict: 'publicacion_id' },
    )
    if (error) throw error
    return { chunks: 0, reindexado: true }
  }

  const embeddings = await embedTexts(supabase, chunks)

  const { error: deleteError } = await supabase
    .from('publicacion_chunk')
    .delete()
    .eq('publicacion_id', id)
  if (deleteError) throw deleteError

  const { error: insertError } = await supabase.from('publicacion_chunk').insert(
    chunks.map((contenido, indice) => ({
      publicacion_id: id,
      indice,
      contenido,
      // pgvector over PostgREST expects the TEXT form "[1,2,3]" — a raw JS array
      // serializes as a Postgres array literal `{1,2,3}` and fails to cast to
      // vector(384).
      embedding: JSON.stringify(embeddings[indice]),
    })),
  )
  if (insertError) throw insertError

  const { error: upsertError } = await supabase.from('publicacion_rag').upsert(
    {
      publicacion_id: id,
      archivo_hash: hash,
      chunks: chunks.length,
      indexado_en: new Date().toISOString(),
    },
    { onConflict: 'publicacion_id' },
  )
  if (upsertError) throw upsertError

  return { chunks: chunks.length, reindexado: true }
}
