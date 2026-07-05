import { createClient } from '@/lib/supabase/server'
import type { Revista, RevistaDetalle } from '@/lib/types/database'

export async function getRevistas({
  estado,
}: {
  estado?: string
} = {}): Promise<{ data: Revista[] | null; error: unknown }> {
  const supabase = await createClient()

  let query = supabase
    .from('revista')
    .select('*')
    .order('publicada_en', { ascending: false })

  if (estado) {
    query = query.eq('estado', estado)
  }

  const { data, error } = await query

  return { data: data as Revista[] | null, error }
}

export async function getRevista(
  id: string
): Promise<{ data: RevistaDetalle | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('revista')
    .select(
      '*, revista_articulo(revista_id, publicacion_id, orden, ' +
        'publicacion(id, titulo, resumen, tipo, usuario!autor_id(id, nombre)))',
    )
    .eq('id', id)
    .order('orden', { referencedTable: 'revista_articulo', ascending: true })
    .single()

  return { data: data as RevistaDetalle | null, error }
}

export async function getRevistaActiva(): Promise<{ data: Revista | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('revista')
    .select('*')
    .eq('estado', 'borrador')
    .maybeSingle()

  return { data: data as Revista | null, error }
}
