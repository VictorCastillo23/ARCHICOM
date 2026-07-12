import { createClient } from '@/lib/supabase/server'
import type { PerfilPublico, PreferenciasNotifApp, Usuario } from '@/lib/types/database'

export async function getPerfil(
  id: string
): Promise<{ data: PerfilPublico | null; error: unknown }> {
  const supabase = await createClient()

  // No `rol`: this runs as `anon` for public profile pages, and SELECT on the
  // rol column is revoked from anon to prevent admin-account enumeration.
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, institucion, carrera, ciudad, creado_en')
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Own user's session fields, including `rol` for nav/admin gating. Only ever
 * called for the authenticated user's own id, where SELECT on rol is allowed.
 */
export async function getSesionUsuario(
  id: string
): Promise<{ data: Pick<Usuario, 'id' | 'nombre' | 'rol'> | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, rol')
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Own user's email notification preference. NOT protected by row RLS —
 * `usuario`'s SELECT policy (`lectura_publica USING (true)`) is row-public,
 * so a plain column GRANT would leak this value across users; SELECT on the
 * column was revoked from `authenticated` entirely (see BD §3.21). The only
 * read path is the `mi_notif_email_habilitado()` RPC, which is RPC-owner-scoped:
 * it derives the row from `auth.uid()` internally, so it can never return
 * another user's preference — no `id` parameter to (mis)supply.
 */
export async function getPreferenciasNotificacion(): Promise<{
  data: boolean | null
  error: unknown
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('mi_notif_email_habilitado')

  return { data, error }
}

/**
 * Own user's in-app notification preferences (5 `notif_app_*` booleans). Same
 * privacy shape as `getPreferenciasNotificacion` above: these columns have NO
 * SELECT grant at all (not even column-scoped) — `usuario`'s SELECT policy is
 * row-public, so any grant would leak them across users. The only read path
 * is the self-scoped SECURITY DEFINER RPC `mis_preferencias_notif_app()`,
 * which derives the row from `auth.uid()` internally. See BD §3.22.
 */
export async function getPreferenciasNotifApp(): Promise<{
  data: PreferenciasNotifApp | null
  error: unknown
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('mis_preferencias_notif_app').single()

  return { data: data as PreferenciasNotifApp | null, error }
}

/**
 * Whether a user has the `administrador` role. Used for admin-only UI gating
 * (e.g. a non-author admin moderating a publication). Security is still enforced
 * by RLS — this only decides what to render.
 */
export async function esAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', userId)
    .single()

  return data?.rol === 'administrador'
}

export async function getPerfilStats(uid: string): Promise<{
  totalPublicaciones: number
  totalEnRevistas: number
  totalLikes: number
}> {
  const supabase = await createClient()

  const [
    { count: pubCount },
    { count: revistaCount },
    { count: likesCount },
  ] = await Promise.all([
    supabase
      .from('publicacion')
      .select('*', { count: 'exact', head: true })
      .eq('autor_id', uid),
    supabase
      .from('revista_articulo')
      .select('publicacion!inner(autor_id), revista!inner(estado)', { count: 'exact', head: true })
      .eq('publicacion.autor_id', uid)
      .eq('revista.estado', 'publicada'),
    supabase
      .from('like')
      .select('publicacion!inner(autor_id)', { count: 'exact', head: true })
      .eq('publicacion.autor_id', uid),
  ])

  return {
    totalPublicaciones: pubCount ?? 0,
    totalEnRevistas: revistaCount ?? 0,
    totalLikes: likesCount ?? 0,
  }
}
