import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Character budget per `embed` invocation. The edge worker running gte-small
 * has a ~2s compute ceiling per request (empirically: ~8000 chars ≈ 1.9s is
 * the edge, ~16000 chars trips WORKER_RESOURCE_LIMIT). We batch well under
 * that so indexing stays reliable regardless of document size. Sizing by
 * total characters (not item count) adapts to whatever chunk length is used.
 */
const MAX_BATCH_CHARS = 4000

/** Group texts into batches whose combined length stays under MAX_BATCH_CHARS. */
function batchByChars(texts: string[]): string[][] {
  const batches: string[][] = []
  let current: string[] = []
  let size = 0

  for (const text of texts) {
    // A single oversized text still goes out on its own (can't split further here).
    if (current.length > 0 && size + text.length > MAX_BATCH_CHARS) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push(text)
    size += text.length
  }
  if (current.length > 0) batches.push(current)

  return batches
}

/**
 * Generates embeddings for a list of texts via the `embed` Edge Function
 * (gte-small, 384 dims). Invoked with the caller's JWT (functions.invoke).
 * Sends the texts in character-bounded batches to stay within the edge
 * worker's compute budget, then concatenates the results in order.
 */
export async function embedTexts(
  supabase: SupabaseClient,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return []

  const result: number[][] = []

  for (const batch of batchByChars(texts)) {
    const { data, error } = await supabase.functions.invoke('embed', {
      body: { input: batch },
    })
    if (error) throw error

    const embeddings = (data as { embeddings?: number[][] } | null)?.embeddings
    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
      throw new Error('embed: respuesta inválida de la edge function')
    }
    result.push(...embeddings)
  }

  return result
}
