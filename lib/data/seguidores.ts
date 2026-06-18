import { createClient } from '@/lib/supabase/server'
import type { PerfilConteos, UsuarioCardData } from '@/lib/types/database'

/**
 * Returns follower/following/publication counts for a user from the
 * perfil_contadores view (security_invoker=true, COALESCE 0 for users with none).
 */
export async function getConteos(
  usuarioId: string
): Promise<{ data: PerfilConteos | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('perfil_contadores')
    .select('usuario_id, n_seguidores, n_seguidos, n_publicaciones')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  return { data, error }
}

/**
 * Returns users who FOLLOW usuarioId (their followers).
 * Embed: usuario via seguidor_id FK (the follower's profile row).
 */
export async function getSeguidores(
  usuarioId: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ data: UsuarioCardData[] | null; error: unknown }> {
  const supabase = await createClient()
  const limit = Math.min(opts?.limit ?? 10, 50)
  const offset = opts?.offset ?? 0

  const { data, error } = await supabase
    .from('seguidor')
    .select('creado_en, usuario:usuario!seguidor_seguidor_id_fkey(id, nombre, institucion, carrera)')
    .eq('seguido_id', usuarioId)
    .range(offset, offset + limit - 1)

  if (error) return { data: null, error }

  // Flatten the embedded relation
  const rows = (data ?? []).map((row) => {
    const u = row.usuario as unknown as UsuarioCardData
    return u
  }).filter(Boolean)

  return { data: rows, error: null }
}

/**
 * Returns users that usuarioId FOLLOWS (their following list).
 * Embed: usuario via seguido_id FK (the followed user's profile row).
 */
export async function getSeguidos(
  usuarioId: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ data: UsuarioCardData[] | null; error: unknown }> {
  const supabase = await createClient()
  const limit = Math.min(opts?.limit ?? 10, 50)
  const offset = opts?.offset ?? 0

  const { data, error } = await supabase
    .from('seguidor')
    .select('creado_en, usuario:usuario!seguidor_seguido_id_fkey(id, nombre, institucion, carrera)')
    .eq('seguidor_id', usuarioId)
    .range(offset, offset + limit - 1)

  if (error) return { data: null, error }

  const rows = (data ?? []).map((row) => {
    const u = row.usuario as unknown as UsuarioCardData
    return u
  }).filter(Boolean)

  return { data: rows, error: null }
}

/**
 * Returns whether seguidorId follows seguidoId.
 * Uses count+head to avoid fetching rows.
 */
export async function getEsSeguido(
  seguidorId: string,
  seguidoId: string
): Promise<{ data: boolean; error: unknown }> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('seguidor')
    .select('seguidor_id', { count: 'exact', head: true })
    .eq('seguidor_id', seguidorId)
    .eq('seguido_id', seguidoId)

  return { data: (count ?? 0) > 0, error }
}
