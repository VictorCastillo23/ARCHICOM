import { createClient } from '@/lib/supabase/server'

export type AreaCount = {
  area: string
  count: number
}

/**
 * Calls the `get_area_counts()` RPC (SECURITY INVOKER, anon-accessible).
 * Returns distinct non-blocked publication counts per tag area.
 * Single RPC call — no N+1 pattern.
 */
export async function getAreaCounts(): Promise<{
  data: AreaCount[] | null
  error: unknown
}> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_area_counts')
  return { data: data as AreaCount[] | null, error }
}

/**
 * Returns only the areas with at least `min` publications (default 3).
 * Uses a single getAreaCounts() call — no extra queries.
 */
export async function getAreasConMinimo(min = 3): Promise<AreaCount[]> {
  const { data } = await getAreaCounts()
  return (data ?? []).filter((a) => a.count >= min)
}

/**
 * Returns the publication count for a specific area (0 if not found).
 * Uses a single getAreaCounts() call — no extra queries.
 */
export async function countForArea(area: string): Promise<number> {
  const { data } = await getAreaCounts()
  return (data ?? []).find((a) => a.area === area)?.count ?? 0
}
