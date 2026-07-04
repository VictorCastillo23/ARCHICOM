import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { embedTexts } from '@/lib/rag/embed'
import { CHAT_MODEL, MAX_PREGUNTA, SIMILARITY_TOP_K, SYSTEM_PROMPT } from '@/lib/rag/config'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

type ChunkMatch = { id: string; contenido: string; similaridad: number }

// Logged-in-only grounded Q&A over título+resumen plus top-K retrieved chunks.
// Login gate is a cost guardrail (no rate limit yet — see design deferred §9).
export async function POST(request: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError('Body inválido')
  }
  const { pregunta } = body as { pregunta?: string }
  const preguntaTrim = pregunta?.trim()

  if (!preguntaTrim) return validationError('pregunta es requerida')
  if (preguntaTrim.length > MAX_PREGUNTA) {
    return validationError(`pregunta no puede superar ${MAX_PREGUNTA} caracteres`)
  }

  const { data: publicacion, error: fetchError } = await supabase
    .from('publicacion')
    .select('titulo, resumen')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return handleError(fetchError)
  if (!publicacion)
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Publicación no encontrada' } },
      { status: 404 },
    )

  let queryEmbedding: number[]
  try {
    const [embedding] = await embedTexts(supabase, [preguntaTrim])
    queryEmbedding = embedding
  } catch (error) {
    return handleError(error)
  }

  const { data: chunks, error: rpcError } = await supabase.rpc('match_publicacion_chunks', {
    p_publicacion_id: id,
    // Same pgvector text-form serialization as the index route.
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_count: SIMILARITY_TOP_K,
  })

  if (rpcError) return handleError(rpcError)

  const matches = (chunks ?? []) as ChunkMatch[]
  const fragmentos =
    matches.length > 0
      ? matches.map((c, i) => `[${i + 1}] ${c.contenido}`).join('\n\n')
      : '(sin fragmentos indexados)'

  const contexto = `Título: ${publicacion.titulo}\nResumen: ${publicacion.resumen}\n\nFragmentos del documento:\n${fragmentos}`
  const prompt = `${contexto}\n\nPregunta: ${preguntaTrim}`

  try {
    const { text } = await generateText({
      model: anthropic(CHAT_MODEL),
      system: SYSTEM_PROMPT,
      prompt,
    })
    return jsonOk({ respuesta: text })
  } catch (error) {
    return handleError(error)
  }
}
