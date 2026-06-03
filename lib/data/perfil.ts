import { createClient } from '@/lib/supabase/server'
import type { Usuario } from '@/lib/types/database'

export async function getPerfil(
  id: string
): Promise<{ data: Usuario | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}
