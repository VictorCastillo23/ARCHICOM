import { createClient } from '@/lib/supabase/server'

/**
 * Reads the indexing state of a publicacion's RAG chunks (`publicacion_rag`).
 * SELECT is public (RLS: `rag_select using (true)`), so this is safe to call
 * for any viewer, including anonymous ones.
 * Returns null when there's no row yet or on error (not indexed / unknown).
 */
export async function getEstadoRag(
  publicacionId: string
): Promise<{ indexado: boolean; chunks: number } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('publicacion_rag')
    .select('chunks')
    .eq('publicacion_id', publicacionId)
    .maybeSingle()

  if (error || !data) return null

  const chunks = data.chunks ?? 0
  return { indexado: chunks > 0, chunks }
}
