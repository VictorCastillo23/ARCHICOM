// Server-only data layer — direct SSR reads for the admin correos historial
// (app/(admin)/admin/correos/page.tsx). RLS (`correo_admin_select using
// es_admin()`) plus proxy.ts's role redirect on /admin/* are the auth guard
// here, same trust model as lib/data/revistas.ts / lib/data/tags.ts.
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CorreoAdminDetalle, DestinatariosCriterio } from '@/lib/types/database'

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

/**
 * Resolves `{ tipo: 'sin_publicacion' }` into a concrete usuario.id list —
 * anyone with zero rows in `publicacion`, regardless of `bloqueada` (having
 * published at all is what counts, not current visibility). Both `usuario.id`
 * and `publicacion.autor_id` are public-readable columns (RLS
 * `lectura_publica`), so this runs under the caller's own JWT like any other
 * admin read — no RPC/schema change needed. The caller still MUST run the
 * resulting ids through `resolver_destinatarios_correo` (never send an
 * unfiltered list to Resend directly) so the `notif_email_habilitado`
 * opt-out still applies, same as a hand-picked "usuarios específicos" list.
 */
export async function resolverIdsSinPublicacion(
  supabase: SupabaseClient,
): Promise<{ ids: string[]; error: unknown }> {
  const [usuarios, publicaciones] = await Promise.all([
    supabase.from('usuario').select('id'),
    supabase.from('publicacion').select('autor_id'),
  ])

  if (usuarios.error) return { ids: [], error: usuarios.error }
  if (publicaciones.error) return { ids: [], error: publicaciones.error }

  const autores = new Set((publicaciones.data ?? []).map((p) => p.autor_id as string))
  const ids = (usuarios.data ?? [])
    .map((u) => u.id as string)
    .filter((id) => !autores.has(id))

  return { ids, error: null }
}

/** Resolved shape the RPC / Edge Function actually understand. */
export type DestinatariosCriterioResuelto = Exclude<DestinatariosCriterio, { tipo: 'sin_publicacion' }>

/**
 * Resolves any `DestinatariosCriterio` the client/admin may send into the
 * shape `resolver_destinatarios_correo` and `enviar-correo-masivo` accept —
 * a no-op passthrough for `todos`/`ciudad`/`ids`, or a concrete `ids` list
 * for `sin_publicacion` (see `resolverIdsSinPublicacion`).
 */
export async function resolverCriterioEnvio(
  supabase: SupabaseClient,
  criterio: DestinatariosCriterio,
): Promise<{ criterio: DestinatariosCriterioResuelto; error: unknown }> {
  if (criterio.tipo !== 'sin_publicacion') return { criterio, error: null }

  const { ids, error } = await resolverIdsSinPublicacion(supabase)
  if (error) return { criterio: { tipo: 'ids', valor: [] }, error }

  return { criterio: { tipo: 'ids', valor: ids }, error: null }
}
