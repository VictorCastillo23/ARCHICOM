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
    .order('creado_en', { ascending: false })

  if (estado) {
    query = query.eq('estado', estado)
  }

  const { data, error } = await query

  return { data, error }
}

export async function getRevista(
  id: string
): Promise<{ data: RevistaDetalle | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('revista')
    .select('*, revista_articulo(*, publicacion(*, usuario(id, nombre)))')
    .eq('id', id)
    .order('orden', { referencedTable: 'revista_articulo', ascending: true })
    .single()

  return { data: data as RevistaDetalle | null, error }
}
