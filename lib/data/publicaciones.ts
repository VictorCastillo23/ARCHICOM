import { createClient } from '@/lib/supabase/server'
import type { Publicacion, PublicacionDetalle } from '@/lib/types/database'

export async function getPublicacionPorArea({
  area,
  limit = 10,
  offset = 0,
}: {
  area: string
  limit?: number
  offset?: number
}): Promise<{ data: (Publicacion & { usuario?: { id: string; nombre: string } | null })[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('publicacion')
    .select('*, publicacion_tag!inner(tag!inner(nombre, area)), usuario(id, nombre)')
    .eq('publicacion_tag.tag.area', area)
    .order('creado_en', { ascending: false })
    .range(offset, offset + limit - 1)

  return { data: data as (Publicacion & { usuario?: { id: string; nombre: string } | null })[] | null, error }
}

export async function getPublicacion(
  id: string
): Promise<{ data: PublicacionDetalle | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('publicacion')
    .select('*, usuario(id, nombre), comentario(*, usuario(id, nombre)), publicacion_tag(*, tag(*))')
    .eq('id', id)
    .single()

  return { data: data as PublicacionDetalle | null, error }
}

export async function getMisPublicaciones(
  autorId: string
): Promise<{ data: Publicacion[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('publicacion')
    .select('*')
    .eq('autor_id', autorId)
    .order('creado_en', { ascending: false })

  return { data, error }
}
