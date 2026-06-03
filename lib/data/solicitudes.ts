import { createClient } from '@/lib/supabase/server'
import type { SolicitudRevista } from '@/lib/types/database'

export async function getMisSolicitudes(
  uid: string
): Promise<{ data: SolicitudRevista[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('solicitud_revista')
    .select('*, revista(id, titulo), publicacion(id, titulo)')
    .eq('solicitante_id', uid)
    .order('creado_en', { ascending: false })

  return { data: data as SolicitudRevista[] | null, error }
}
