import { createClient } from '@/lib/supabase/server'
import type { Revista, RevistaDetalle } from '@/lib/types/database'

export type RevistaConEditor = Revista & { editor?: { id: string; nombre: string } | null }

export async function getRevistas({
  estado,
}: {
  estado?: string
} = {}): Promise<{ data: RevistaConEditor[] | null; error: unknown }> {
  const supabase = await createClient()

  let query = supabase
    .from('revista')
    .select('*, editor:usuario(id, nombre)')
    .order('publicada_en', { ascending: false })

  if (estado) {
    query = query.eq('estado', estado)
  }

  const { data, error } = await query

  return { data: data as RevistaConEditor[] | null, error }
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
