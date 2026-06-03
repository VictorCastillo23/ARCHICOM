import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import type { EstadoSolicitud } from '@/lib/types/database'

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { searchParams } = new URL(request.url)
  const revista_id = searchParams.get('revista_id') ?? undefined
  const estado = (searchParams.get('estado') ?? undefined) as EstadoSolicitud | undefined

  let query = admin.supabase
    .from('solicitud_revista')
    .select('*, revista(id, titulo), publicacion(id, titulo)')
    .order('creado_en', { ascending: false })

  if (revista_id) query = query.eq('revista_id', revista_id)
  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return handleError(error)

  return jsonOk({ solicitudes: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { publicacion_id, revista_id, mensaje } = body

  if (!publicacion_id || !revista_id) {
    return validationError('Se requieren publicacion_id y revista_id')
  }

  const { data, error } = await supabase
    .from('solicitud_revista')
    .insert({
      publicacion_id,
      revista_id,
      mensaje: mensaje ?? null,
      solicitante_id: user.id,
    })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ solicitud: data }, 201)
}
