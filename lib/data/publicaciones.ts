import { createClient } from '@/lib/supabase/server'
import type { Publicacion, PublicacionCardData, PublicacionDetalle, TipoPublicacion } from '@/lib/types/database'

export async function getPublicacionPorArea({
  area,
  limit = 24,
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

export async function getPublicacionesRelacionadas(
  publicacionId: string,
  tagIds: string[],
  tipo: TipoPublicacion
): Promise<PublicacionCardData[]> {
  const supabase = await createClient()

  let paso1: PublicacionCardData[] = []

  if (tagIds.length > 0) {
    const { data } = await supabase
      .from('publicacion')
      .select('id, titulo, resumen, tipo, autor_id, creado_en, usuario(id, nombre)')
      .in('id',
        (await supabase
          .from('publicacion_tag')
          .select('publicacion_id')
          .in('tag_id', tagIds)
          .neq('publicacion_id', publicacionId)
        ).data?.map((r: { publicacion_id: string }) => r.publicacion_id) ?? []
      )
      .neq('id', publicacionId)
      .order('creado_en', { ascending: false })
      .limit(4)

    paso1 = (data as any[] ?? []).map((p) => ({
      id: p.id as string,
      titulo: p.titulo as string,
      resumen: p.resumen as string,
      tipo: p.tipo as TipoPublicacion,
      nombre_autor: (Array.isArray(p.usuario) ? p.usuario[0]?.nombre : p.usuario?.nombre) ?? 'Autor desconocido',
      autor_id: p.autor_id as string,
      creado_en: p.creado_en as string,
    }))
  }

  if (paso1.length < 3) {
    const excluir = [publicacionId, ...paso1.map((p) => p.id)]
    const faltantes = 4 - paso1.length
    const { data } = await supabase
      .from('publicacion')
      .select('id, titulo, resumen, tipo, autor_id, creado_en, usuario(id, nombre)')
      .eq('tipo', tipo)
      .not('id', 'in', `(${excluir.join(',')})`)
      .order('creado_en', { ascending: false })
      .limit(faltantes)

    const paso2: PublicacionCardData[] = (data as any[] ?? []).map((p) => ({
      id: p.id as string,
      titulo: p.titulo as string,
      resumen: p.resumen as string,
      tipo: p.tipo as TipoPublicacion,
      nombre_autor: (Array.isArray(p.usuario) ? p.usuario[0]?.nombre : p.usuario?.nombre) ?? 'Autor desconocido',
      autor_id: p.autor_id as string,
      creado_en: p.creado_en as string,
    }))

    return [...paso1, ...paso2]
  }

  return paso1
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
