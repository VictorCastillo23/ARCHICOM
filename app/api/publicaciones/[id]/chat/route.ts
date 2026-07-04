import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { embedTexts } from '@/lib/rag/embed'
import {
  CHAT_MODEL,
  CONDENSE_PROMPT,
  MAX_HISTORIAL,
  MAX_PREGUNTA,
  RATE_LIMIT_MAX,
  SIMILARITY_TOP_K,
  SYSTEM_PROMPT,
} from '@/lib/rag/config'
import type { RagMensaje } from '@/lib/types/database'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

type ChunkMatch = { id: string; contenido: string; similaridad: number }

// Logged-in-only grounded Q&A over título+resumen plus top-K retrieved chunks.
// Login gate + a per-account hourly quota (RATE_LIMIT_MAX questions/hour via
// consumir_cuota_rag) guard the cost of the LLM calls.
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
  const { pregunta, historial } = body as { pregunta?: string; historial?: unknown }
  const preguntaTrim = pregunta?.trim()

  if (!preguntaTrim) return validationError('pregunta es requerida')
  if (preguntaTrim.length > MAX_PREGUNTA) {
    return validationError(`pregunta no puede superar ${MAX_PREGUNTA} caracteres`)
  }

  // Optional conversational memory: validate, keep only the last MAX_HISTORIAL
  // turns, and cap each message length to bound the prompt size.
  let historialLimpio: RagMensaje[] = []
  if (historial !== undefined) {
    if (!Array.isArray(historial)) return validationError('historial inválido')
    for (const item of historial) {
      const rol = (item as RagMensaje)?.rol
      const contenido = (item as RagMensaje)?.contenido
      if ((rol !== 'user' && rol !== 'assistant') || typeof contenido !== 'string') {
        return validationError('historial inválido')
      }
    }
    historialLimpio = (historial as RagMensaje[])
      .slice(-MAX_HISTORIAL)
      .map((m) => ({ rol: m.rol, contenido: m.contenido.slice(0, 2000) }))
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

  // Rate limit: 15 questions/hour per account. Enforced atomically by the RPC,
  // which mutates a tamper-proof counter (RLS denies direct writes). Checked
  // before the expensive condense/embed/generate work.
  const { data: cuotaData, error: cuotaError } = await supabase.rpc('consumir_cuota_rag')
  if (cuotaError) return handleError(cuotaError)
  const cuota = (cuotaData ?? []) as Array<{ permitido: boolean; restantes: number }>
  if (!cuota[0]?.permitido) {
    return NextResponse.json(
      {
        error: {
          code: 'rate_limited',
          message: `Alcanzaste el límite de ${RATE_LIMIT_MAX} preguntas por hora. Prueba de nuevo más tarde.`,
        },
      },
      { status: 429 },
    )
  }

  // Condense: rewrite a follow-up into a standalone question so it retrieves
  // well. Only when there is history; failure is non-fatal (fall back to raw).
  let preguntaBusqueda = preguntaTrim
  if (historialLimpio.length > 0) {
    try {
      const historialTexto = historialLimpio
        .map((m) => `${m.rol === 'user' ? 'Usuario' : 'Asistente'}: ${m.contenido}`)
        .join('\n')
      const { text } = await generateText({
        model: anthropic(CHAT_MODEL),
        system: CONDENSE_PROMPT,
        prompt: `Conversación previa:\n${historialTexto}\n\nPregunta de seguimiento: ${preguntaTrim}`,
      })
      const condensada = text.trim()
      if (condensada) preguntaBusqueda = condensada
    } catch {
      preguntaBusqueda = preguntaTrim
    }
  }

  let queryEmbedding: number[]
  try {
    const [embedding] = await embedTexts(supabase, [preguntaBusqueda])
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
  const conversacion =
    historialLimpio.length > 0
      ? '\n\nConversación previa:\n' +
        historialLimpio
          .map((m) => `${m.rol === 'user' ? 'Usuario' : 'Asistente'}: ${m.contenido}`)
          .join('\n')
      : ''
  const prompt = `${contexto}${conversacion}\n\nPregunta actual: ${preguntaTrim}`

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
