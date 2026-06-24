import { createClient } from '@/lib/supabase/server'
import type { Comentario, ComentarioArbol, ComentarioConUsuario } from '@/lib/types/database'

export async function getComentarios(
  publicacionId: string
): Promise<{ data: Comentario[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comentario')
    .select('*, usuario(id, nombre)')
    .eq('publicacion_id', publicacionId)
    .order('creado_en', { ascending: false })

  return { data: data as Comentario[] | null, error }
}

export async function getComentariosArbol(
  publicacionId: string
): Promise<{ data: { arbol: ComentarioArbol[]; total: number } | null; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comentario')
    .select('*, usuario(id, nombre)')
    .eq('publicacion_id', publicacionId)
    .order('creado_en', { ascending: true })

  if (error) return { data: null, error }
  if (!data || data.length === 0) return { data: { arbol: [], total: 0 }, error: null }

  const total = data.length
  const rows = data as ComentarioConUsuario[]

  // Index replies by their parent root id
  const repliesByRoot = new Map<string, ComentarioConUsuario[]>()
  const roots: ComentarioConUsuario[] = []

  for (const row of rows) {
    if (row.responde_a === null) {
      roots.push(row)
    } else {
      const existing = repliesByRoot.get(row.responde_a) ?? []
      existing.push(row)
      repliesByRoot.set(row.responde_a, existing)
    }
  }

  // Attach replies to roots; replies stay ASC (query order); sort roots DESC
  const arbol: ComentarioArbol[] = roots
    .toSorted((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
    .map((root) => ({
      ...root,
      respuestas: repliesByRoot.get(root.id) ?? [],
    }))

  return { data: { arbol, total }, error: null }
}
