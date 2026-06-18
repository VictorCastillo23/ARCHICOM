import { createClient } from '@/lib/supabase/server'
import type { UsuarioLink } from '@/lib/types/database'

/**
 * Fetches all links for a given user, ordered by `orden ASC, creado_en ASC`.
 * Server-only module — no 'use client'. Runs as anon for public pages
 * (links_lectura_publica policy allows it) and as the session user on /perfil.
 */
export async function getLinksUsuario(
  usuarioId: string,
): Promise<{ data: UsuarioLink[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuario_link')
    .select('id, usuario_id, etiqueta, url, orden, creado_en')
    .eq('usuario_id', usuarioId)
    .order('orden', { ascending: true })
    .order('creado_en', { ascending: true })

  return { data, error }
}
