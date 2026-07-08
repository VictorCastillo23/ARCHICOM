import { createClient } from '@/lib/supabase/server'
import type { PerfilPublico, Usuario } from '@/lib/types/database'

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
