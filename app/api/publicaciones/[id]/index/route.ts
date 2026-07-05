import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { indexarPublicacion } from '@/lib/rag/indexer'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

// Author-only: runs the shared RAG indexing pipeline over the publication's PDF
// (extract → chunk → embed → persist), idempotent via a sha256 fingerprint.
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

  try {
    const result = await indexarPublicacion(supabase, { id, archivoUrl })
    return jsonOk(result)
  } catch (error) {
    return handleError(error)
  }
}
