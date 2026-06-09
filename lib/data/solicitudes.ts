import { createClient } from '@/lib/supabase/server'
import type { SolicitudRevista, SolicitudRevistaDetalle } from '@/lib/types/database'

export async function getMisSolicitudes(
  uid: string
): Promise<{ data: SolicitudRevistaDetalle[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('solicitud_revista')
    .select('*, revista(id, titulo), publicacion(id, titulo)')
    .eq('solicitante_id', uid)
    .order('solicitado_en', { ascending: false })

  return { data: data as SolicitudRevistaDetalle[] | null, error }
}

export async function getSolicitudParaEdicion(
  publicacionId: string,
  revistaId: string
): Promise<{ data: Pick<SolicitudRevista, 'id' | 'estado'> | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('solicitud_revista')
    .select('id, estado')
    .eq('publicacion_id', publicacionId)
    .eq('revista_id', revistaId)
    .maybeSingle()

  return { data, error }
}
