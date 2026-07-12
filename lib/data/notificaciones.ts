import { createClient } from '@/lib/supabase/server'
import type { NotificacionConActor, TipoNotificacion } from '@/lib/types/database'

const MAX_LIMIT = 50

// Embeds the actor's public identity via the `usuario_relacionado_id` FK.
// `notificacion` has two FKs to `usuario` (usuario_id, usuario_relacionado_id)
// so the constraint name disambiguates the embed (mirrors seguidores.ts /
// reportes.ts, which use the same `alias:usuario!<fk>_fkey(...)` pattern).
const SELECT_WITH_ACTOR =
  'id, usuario_id, tipo, usuario_relacionado_id, publicacion_relacionada_id, comentario_relacionado_id, descripcion, enlace, contador, leida, leida_en, creada_en, ' +
  'usuario_relacionado:usuario!notificacion_usuario_relacionado_id_fkey(id, nombre)'

/**
 * Returns a paginated page of the current session user's notifications, plus
 * the total matching count (for pagination controls). RLS (`notif_select`)
 * scopes rows to `auth.uid()` — no usuario_id param needed. `tipo` filters
 * server-side only (used by the `/notificaciones` page, not the route
 * handler — see BD §3.22 / spec's `leidas`/`tipo` page filters).
 */
export async function getNotificaciones(opts?: {
  filtro?: 'no-leidas'
  tipo?: TipoNotificacion
  limit?: number
  offset?: number
}): Promise<{
  data: { items: NotificacionConActor[]; total: number } | null
  error: unknown
}> {
  const supabase = await createClient()
  const limit = Math.min(opts?.limit ?? 20, MAX_LIMIT)
  const offset = opts?.offset ?? 0

  let query = supabase
    .from('notificacion')
    .select(SELECT_WITH_ACTOR, { count: 'exact' })
    .order('creada_en', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts?.filtro === 'no-leidas') {
    query = query.eq('leida', false)
  }
  if (opts?.tipo) {
    query = query.eq('tipo', opts.tipo)
  }

  const { data, error, count } = await query

  if (error) return { data: null, error }

  return {
    data: { items: (data as unknown as NotificacionConActor[]) ?? [], total: count ?? 0 },
    error: null,
  }
}

/**
 * Returns the total unread notification count for the current session user.
 * Uses count+head to avoid fetching rows — feeds the nav bell badge.
 */
export async function getTotalNoLeidas(): Promise<{ data: number; error: unknown }> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('notificacion')
    .select('id', { count: 'exact', head: true })
    .eq('leida', false)

  return { data: count ?? 0, error }
}
