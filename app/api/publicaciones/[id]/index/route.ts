import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { getStoragePathFromPublicUrl, PUBLICACIONES_BUCKET } from '@/lib/supabase/storage'
import { chunkText, extractPdfText } from '@/lib/rag/pdf'
import { embedTexts } from '@/lib/rag/embed'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

// Author-only: extracts text from the publication's PDF, chunks it, embeds
// each chunk (via the `embed` Edge Function) and persists them, idempotent
// across re-runs via a sha256 fingerprint of the file bytes.
export async function POST(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const { data: publicacion, error: fetchError } = await supabase
    .from('publicacion')
    .select('autor_id, archivo_url')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return handleError(fetchError)
  if (!publicacion)
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Publicación no encontrada' } },
      { status: 404 },
    )

  // Defense in depth — RLS (`chunk_insert`/`rag_write`) is the real guard.
  if (publicacion.autor_id !== user.id)
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Solo el autor puede indexar esta publicación' } },
      { status: 403 },
    )

  const archivoUrl = publicacion.archivo_url
  if (!archivoUrl || !archivoUrl.toLowerCase().endsWith('.pdf')) {
    return validationError('La publicación no tiene un PDF para indexar')
  }

  const path = getStoragePathFromPublicUrl(archivoUrl)
  if (!path) return validationError('No se pudo resolver la ruta del archivo en Storage')

  const { data: blob, error: downloadError } = await supabase.storage
    .from(PUBLICACIONES_BUCKET)
    .download(path)

  if (downloadError) return handleError(downloadError)

  const bytes = new Uint8Array(await blob.arrayBuffer())
  const hash = createHash('sha256').update(bytes).digest('hex')

  const { data: existingRag, error: ragFetchError } = await supabase
    .from('publicacion_rag')
    .select('archivo_hash, chunks')
    .eq('publicacion_id', id)
    .maybeSingle()

  if (ragFetchError) return handleError(ragFetchError)

  // Idempotency: same file bytes and already has chunks → skip re-indexing.
  if (existingRag && existingRag.archivo_hash === hash && existingRag.chunks > 0) {
    return jsonOk({ chunks: existingRag.chunks, reindexado: false })
  }

  let chunks: string[]
  try {
    const texto = await extractPdfText(bytes)
    chunks = chunkText(texto)
  } catch (error) {
    return handleError(error)
  }

  // Scanned/empty PDF (no extractable text layer): no chunks, but still mark
  // the publication as processed. Chat falls back to título+resumen.
  if (chunks.length === 0) {
    const { error: upsertError } = await supabase.from('publicacion_rag').upsert(
      {
        publicacion_id: id,
        archivo_hash: hash,
        chunks: 0,
        indexado_en: new Date().toISOString(),
      },
      { onConflict: 'publicacion_id' },
    )
    if (upsertError) return handleError(upsertError)
    return jsonOk({ chunks: 0, reindexado: true })
  }

  let embeddings: number[][]
  try {
    embeddings = await embedTexts(supabase, chunks)
  } catch (error) {
    return handleError(error)
  }

  const { error: deleteError } = await supabase
    .from('publicacion_chunk')
    .delete()
    .eq('publicacion_id', id)

  if (deleteError) return handleError(deleteError)

  const { error: insertError } = await supabase.from('publicacion_chunk').insert(
    chunks.map((contenido, indice) => ({
      publicacion_id: id,
      indice,
      contenido,
      // pgvector over PostgREST expects the TEXT form "[1,2,3]" — a raw JS
      // array would be serialized as a Postgres array literal `{1,2,3}` and
      // fail to cast into `vector(384)`.
      embedding: JSON.stringify(embeddings[indice]),
    })),
  )

  if (insertError) return handleError(insertError)

  const { error: upsertError } = await supabase.from('publicacion_rag').upsert(
    {
      publicacion_id: id,
      archivo_hash: hash,
      chunks: chunks.length,
      indexado_en: new Date().toISOString(),
    },
    { onConflict: 'publicacion_id' },
  )

  if (upsertError) return handleError(upsertError)

  return jsonOk({ chunks: chunks.length, reindexado: true })
}
