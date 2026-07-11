import { createClient } from '@/lib/supabase/server'
import type { FeedPublicacion } from '@/lib/types/database'

// Explicit column list — score is intentionally excluded from the DTO.
// The view computes score for ordering only; clients must never receive it.
// At high volume, consider a cron-refreshed materialized view (pg_cron) to
// avoid per-query decay computation — not implemented at MVP.
const TRENDING_COLUMNS =
  'id,titulo,resumen,tipo,archivo_url,archivo_thumbnail_url,autor_id,autor_nombre,obra_autor_externo,url_externa,creado_en'

export async function getTrendingFeed({
  limit = 3,
  offset = 0,
}: {
  limit?: number
  offset?: number
} = {}): Promise<{ data: FeedPublicacion[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('feed_trending')
    .select(TRENDING_COLUMNS)
    .order('score', { ascending: false })
    .range(offset, offset + limit - 1)

  return { data: data as FeedPublicacion[] | null, error }
}
