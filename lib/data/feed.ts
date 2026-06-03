import { createClient } from '@/lib/supabase/server'
import type { FeedPublicacion } from '@/lib/types/database'

export async function getFeed({
  tipo,
  limit = 10,
  offset = 0,
}: {
  tipo?: string
  limit?: number
  offset?: number
} = {}): Promise<{ data: FeedPublicacion[] | null; error: unknown }> {
  const supabase = await createClient()

  let query = supabase
    .from('feed_publicaciones')
    .select('*')
    .order('creado_en', { ascending: false })

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  return { data, error }
}
