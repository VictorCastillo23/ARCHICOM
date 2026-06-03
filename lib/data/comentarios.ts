import { createClient } from '@/lib/supabase/server'
import type { Comentario } from '@/lib/types/database'

export async function getComentarios(
  publicacionId: string
): Promise<{ data: Comentario[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comentario')
    .select('*, usuario(id, nombre)')
    .eq('publicacion_id', publicacionId)
    .order('creado_en', { ascending: false })

  return { data: data as Comentario[] | null, error }
}
