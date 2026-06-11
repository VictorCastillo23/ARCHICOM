import { createClient } from '@/lib/supabase/server'
import type { PerfilPublico } from '@/lib/types/database'

export async function getPerfil(
  id: string
): Promise<{ data: PerfilPublico | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, rol, institucion, carrera, creado_en')
    .eq('id', id)
    .single()

  return { data, error }
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
