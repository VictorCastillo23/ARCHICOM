import { createClient } from '@/lib/supabase/server'
import type { Tag } from '@/lib/types/database'

export async function getTags(): Promise<{ data: Tag[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tag')
    .select('*')
    .order('area')
    .order('nombre')

  return { data, error }
}
