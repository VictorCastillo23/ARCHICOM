import { createClient } from '@/lib/supabase/server'
import type { Coleccion, ColeccionDetalle } from '@/lib/types/database'

/**
 * Returns the collections owned by usuarioId (any visibilidad), newest first.
 * Used by the /perfil/colecciones management page (SSR).
 */
export async function getMisColecciones(
  usuarioId: string
): Promise<{ data: Coleccion[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coleccion')
    .select('id, usuario_id, titulo, descripcion, visibilidad, creado_en')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })

  return { data: data as Coleccion[] | null, error }
}

/**
 * Returns a single collection with its member publications, or null when RLS
 * filters it out (private collection, non-owner). Uses .maybeSingle() instead
 * of .single() so a 0-row result (RLS-denied) yields a clean null — the
 * caller renders notFound() — rather than a PGRST116 throw.
 */
export async function getColeccion(
  id: string
): Promise<{ data: ColeccionDetalle | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coleccion')
    .select(
      'id, usuario_id, titulo, descripcion, visibilidad, creado_en, ' +
        'coleccion_publicacion(coleccion_id, publicacion_id, orden, agregado_en, ' +
        'publicacion(id, titulo, resumen, tipo, archivo_url, archivo_thumbnail_url, usuario(id, nombre)))'
    )
    .eq('id', id)
    .order('orden', { referencedTable: 'coleccion_publicacion', ascending: true })
    .maybeSingle()

  return { data: data as ColeccionDetalle | null, error }
}
