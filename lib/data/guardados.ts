import { createClient } from '@/lib/supabase/server'
import type { PublicacionCardData, TipoPublicacion, Usuario } from '@/lib/types/database'

/**
 * Returns whether usuarioId has saved publicacionId.
 * Uses count+head to avoid fetching rows. When usuarioId is undefined
 * (anonymous visitor) returns false without hitting the database.
 */
export async function getIsGuardado(
  publicacionId: string,
  usuarioId?: string
): Promise<{ data: boolean; error: unknown }> {
  if (!usuarioId) return { data: false, error: null }

  const supabase = await createClient()

  const { count, error } = await supabase
    .from('guardado')
    .select('id', { count: 'exact', head: true })
    .eq('publicacion_id', publicacionId)
    .eq('usuario_id', usuarioId)

  return { data: (count ?? 0) > 0, error }
}

/**
 * Returns the publications saved by usuarioId, shaped as feed cards.
 * Ordered by save time (guardado.creado_en desc), not publication date.
 * Embeds the publication and its author via the verified FK hint.
 */
export async function getMisGuardados(
  usuarioId: string
): Promise<{ data: PublicacionCardData[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('guardado')
    .select(
      'creado_en, publicacion:publicacion!guardado_publicacion_id_fkey(id, titulo, resumen, tipo, autor_id, creado_en, archivo_url, archivo_thumbnail_url, usuario(id, nombre))'
    )
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })

  if (error) return { data: null, error }

  type GuardadoRow = {
    publicacion:
      | (Pick<
          PublicacionCardData,
          'id' | 'titulo' | 'resumen' | 'autor_id' | 'creado_en'
        > & {
          tipo: TipoPublicacion
          archivo_url: string | null
          archivo_thumbnail_url: string | null
          usuario?: Pick<Usuario, 'id' | 'nombre'> | null
        })
      | null
  }

  const cards = ((data ?? []) as unknown as GuardadoRow[])
    .map((row): PublicacionCardData | null => {
      const p = row.publicacion
      if (!p) return null
      return {
        id: p.id,
        titulo: p.titulo,
        resumen: p.resumen,
        tipo: p.tipo,
        nombre_autor: p.usuario?.nombre ?? 'Autor desconocido',
        autor_id: p.autor_id,
        creado_en: p.creado_en,
        archivo_url: p.archivo_url ?? undefined,
        archivo_thumbnail_url: p.archivo_thumbnail_url,
      }
    })
    .filter((c): c is PublicacionCardData => c !== null)

  return { data: cards, error: null }
}
