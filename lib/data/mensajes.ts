import { createClient } from '@/lib/supabase/server'
import { getEsSeguido } from '@/lib/data/seguidores'
import type {
  Conversacion,
  ConversacionResumen,
  Mensaje,
  SolicitudMensajeRecibida,
  UsuarioCardData,
} from '@/lib/types/database'

/**
 * Returns the inbox for viewerId, ordered by most recent activity.
 * Resolves `otro` (the non-viewer participant) with a single batched usuario query
 * to avoid N+1.
 */
export async function getConversaciones(
  viewerId: string
): Promise<{ data: ConversacionResumen[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data: filas, error } = await supabase
    .from('bandeja_conversaciones')
    .select(
      'conversacion_id, usuario_a, usuario_b, actualizado_en, ultimo_contenido, ultimo_emisor_id, ultimo_creado_en, no_leidos'
    )
    .order('actualizado_en', { ascending: false })

  if (error) return { data: null, error }
  if (!filas || filas.length === 0) return { data: [], error: null }

  // Collect all "otro" IDs (the participant that is not the viewer)
  const otroIds = filas.map((f) =>
    f.usuario_a === viewerId ? f.usuario_b : f.usuario_a
  )

  // Single batched query for profiles — no N+1
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuario')
    .select('id, nombre, institucion, carrera')
    .in('id', otroIds)

  if (usuariosError) return { data: null, error: usuariosError }

  const perfilMap = new Map<string, UsuarioCardData>(
    (usuarios ?? []).map((u) => [u.id, u as UsuarioCardData])
  )

  const conversaciones: ConversacionResumen[] = filas.map((f) => {
    const otroId = f.usuario_a === viewerId ? f.usuario_b : f.usuario_a
    const otro = perfilMap.get(otroId) ?? {
      id: otroId,
      nombre: 'Usuario desconocido',
    }
    return {
      conversacion_id: f.conversacion_id as string,
      otro,
      ultimo_contenido: f.ultimo_contenido as string | null,
      ultimo_emisor_id: f.ultimo_emisor_id as string | null,
      ultimo_creado_en: f.ultimo_creado_en as string | null,
      actualizado_en: f.actualizado_en as string,
      no_leidos: (f.no_leidos as number) ?? 0,
    }
  })

  return { data: conversaciones, error: null }
}

/**
 * Returns paginated messages for a conversation, ascending chronologically.
 * RLS (mensaje_lectura) ensures only participants see rows.
 */
export async function getMensajes(
  conversacionId: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ data: Mensaje[] | null; error: unknown }> {
  const supabase = await createClient()
  const limit = Math.min(opts?.limit ?? 20, 50)
  const offset = opts?.offset ?? 0

  const { data, error } = await supabase
    .from('mensaje')
    .select('id, conversacion_id, emisor_id, contenido, leido, creado_en')
    .eq('conversacion_id', conversacionId)
    .order('creado_en', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) return { data: null, error }
  return { data: (data as Mensaje[]) ?? [], error: null }
}

/**
 * Finds an existing conversation between two users (order-independent).
 */
export async function getConversacionConUsuario(
  viewerId: string,
  otroId: string
): Promise<{ data: Conversacion | null; error: unknown }> {
  const supabase = await createClient()

  const a = viewerId < otroId ? viewerId : otroId
  const b = viewerId < otroId ? otroId : viewerId

  const { data, error } = await supabase
    .from('conversacion')
    .select('id, usuario_a, usuario_b, creado_en, actualizado_en')
    .eq('usuario_a', a)
    .eq('usuario_b', b)
    .maybeSingle()

  if (error) return { data: null, error }
  return { data: data as Conversacion | null, error: null }
}

/**
 * Returns whether a and b mutually follow each other.
 * VISUAL GATE ONLY — real security enforcement is in the RPC enviar_mensaje.
 */
export async function getSeSiguenMutuamente(
  a: string,
  b: string
): Promise<{ data: boolean; error: unknown }> {
  const [aToB, bToA] = await Promise.all([getEsSeguido(a, b), getEsSeguido(b, a)])

  if (aToB.error || bToA.error) {
    return { data: false, error: aToB.error ?? bToA.error }
  }

  return { data: aToB.data && bToA.data, error: null }
}

/**
 * Returns the total unread count across all inbox conversations for the current
 * session user. The security_invoker view scopes rows to auth.uid() via RLS, so
 * no viewer id is needed. Used by the nav unread badge (RSC fetch, no polling).
 */
export async function getTotalNoLeidos(): Promise<{ data: number; error: unknown }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bandeja_conversaciones')
    .select('no_leidos')
    .order('actualizado_en', { ascending: false })

  if (error) return { data: 0, error }

  const total = (data ?? []).reduce(
    (sum, row) => sum + ((row.no_leidos as number) ?? 0),
    0
  )

  return { data: total, error: null }
}

/**
 * Returns pending message requests received by viewerId, with the sender's profile.
 * Uses a batched query (no N+1) to resolve emisor profiles — mirrors getConversaciones.
 */
export async function getSolicitudesMensajeRecibidas(
  viewerId: string
): Promise<{ data: SolicitudMensajeRecibida[] | null; error: unknown }> {
  const supabase = await createClient()

  const { data: filas, error } = await supabase
    .from('solicitud_mensaje')
    .select('id, emisor_id, creado_en')
    .eq('receptor_id', viewerId)
    .eq('estado', 'pendiente')
    .order('creado_en', { ascending: false })

  if (error) return { data: null, error }
  if (!filas || filas.length === 0) return { data: [], error: null }

  const emisorIds = filas.map((f) => f.emisor_id as string)

  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuario')
    .select('id, nombre, institucion, carrera')
    .in('id', emisorIds)

  if (usuariosError) return { data: null, error: usuariosError }

  const perfilMap = new Map<string, UsuarioCardData>(
    (usuarios ?? []).map((u) => [u.id, u as UsuarioCardData])
  )

  const solicitudes: SolicitudMensajeRecibida[] = filas.map((f) => ({
    id: f.id as string,
    emisor: perfilMap.get(f.emisor_id as string) ?? {
      id: f.emisor_id as string,
      nombre: 'Usuario desconocido',
    },
    creado_en: f.creado_en as string,
  }))

  return { data: solicitudes, error: null }
}

/**
 * Returns whether emisorId has a pending message request to receptorId.
 * Used as a visual gate for the "Enviar mensaje" button.
 */
export async function getSolicitudMensajePendiente(
  emisorId: string,
  receptorId: string
): Promise<{ data: boolean; error: unknown }> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('solicitud_mensaje')
    .select('id', { count: 'exact', head: true })
    .eq('emisor_id', emisorId)
    .eq('receptor_id', receptorId)
    .eq('estado', 'pendiente')

  return { data: (count ?? 0) > 0, error }
}

/**
 * Returns the total number of pending message requests received by viewerId.
 * Used to include in the nav unread badge.
 */
export async function getTotalSolicitudesPendientes(
  viewerId: string
): Promise<{ data: number; error: unknown }> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('solicitud_mensaje')
    .select('id', { count: 'exact', head: true })
    .eq('receptor_id', viewerId)
    .eq('estado', 'pendiente')

  return { data: count ?? 0, error }
}
