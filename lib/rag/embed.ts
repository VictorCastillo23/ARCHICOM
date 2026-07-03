import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generates embeddings for a batch of texts via the `embed` Edge Function
 * (gte-small, 384 dims). Invoked with the caller's JWT (functions.invoke).
 */
export async function embedTexts(
  supabase: SupabaseClient,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return []

  const { data, error } = await supabase.functions.invoke('embed', {
    body: { input: texts },
  })
  if (error) throw error

  const embeddings = (data as { embeddings?: number[][] } | null)?.embeddings
  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new Error('embed: respuesta inválida de la edge function')
  }
  return embeddings
}
