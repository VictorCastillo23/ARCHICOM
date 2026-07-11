// Server-only data layer — direct SSR reads for the admin correos historial
// (app/(admin)/admin/correos/page.tsx). RLS (`correo_admin_select using
// es_admin()`) plus proxy.ts's role redirect on /admin/* are the auth guard
// here, same trust model as lib/data/revistas.ts / lib/data/tags.ts.
import { createClient } from '@/lib/supabase/server'
import type { CorreoAdminDetalle } from '@/lib/types/database'

const SELECT_CORREO_DETALLE =
  'id, admin_id, asunto, cuerpo, destinatarios_criterio, cantidad_destinatarios, ' +
  'cantidad_enviados, cantidad_fallidos, estado, enviado_en, ' +
  'admin:usuario!correo_admin_admin_id_fkey(id, nombre)'

export async function getCorreosAdmin({
  limit = 10,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<{
  correos: CorreoAdminDetalle[]
  hasMore: boolean
  error: unknown
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('correo_admin')
    .select(SELECT_CORREO_DETALLE)
    .order('enviado_en', { ascending: false })
    .range(offset, offset + limit - 1)

  const correos = (data ?? []) as unknown as CorreoAdminDetalle[]
  return { correos, hasMore: correos.length === limit, error }
}
