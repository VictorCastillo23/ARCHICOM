import { createClient } from '@/lib/supabase/server'
import type { SolicitudConDetalle, SolicitudRevista } from '@/lib/types/database'

export async function getMisSolicitudes(
  uid: string
): Promise<{ data: SolicitudConDetalle[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('solicitud_revista')
    .select('*, revista(id, titulo, volumen, estado), publicacion(id, titulo, tipo)')
    .eq('solicitante_id', uid)
    .order('solicitado_en', { ascending: false })

  return { data: data as SolicitudConDetalle[] | null, error }
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
