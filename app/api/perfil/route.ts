import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { institucion, carrera, ciudad, nombre, notif_email_habilitado } = body as {
    institucion?: string
    carrera?: string
    ciudad?: string
    nombre?: string
    notif_email_habilitado?: boolean
  }

  if (nombre !== undefined && nombre.length > 50)
    return validationError('El nombre no puede superar 50 caracteres.')
  if (institucion !== undefined && institucion.length > 50)
    return validationError('La institución no puede superar 50 caracteres.')
  if (carrera !== undefined && carrera.length > 50)
    return validationError('La carrera no puede superar 50 caracteres.')
  if (ciudad !== undefined && typeof ciudad === 'string' && ciudad.length > 50)
    return validationError('La ciudad no puede superar 50 caracteres.')
  if (notif_email_habilitado !== undefined && typeof notif_email_habilitado !== 'boolean')
    return validationError('notif_email_habilitado debe ser verdadero o falso')

  const updates: Record<string, string | boolean> = {}
  if (institucion !== undefined) updates.institucion = institucion
  if (carrera !== undefined) updates.carrera = carrera
  if (ciudad !== undefined) updates.ciudad = ciudad
  if (nombre !== undefined) updates.nombre = nombre
  if (notif_email_habilitado !== undefined)
    updates.notif_email_habilitado = notif_email_habilitado

  const { data, error } = await supabase
    .from('usuario')
    .update(updates)
    .eq('id', user.id)
    .select('id, nombre, rol, institucion, carrera, ciudad, creado_en')
    .single()

  if (error) return handleError(error)

  // notif_email_habilitado is column-grant-blocked from `authenticated` SELECT
  // (usuario's SELECT policy is row-public, not row-scoped — a plain column
  // GRANT would leak this preference across users; see BD §3.21). The only
  // read path is the self-scoped RPC, so it's fetched separately here and
  // merged into the response instead of being part of the .select() above.
  const { data: notifEmailHabilitado, error: notifError } = await supabase.rpc(
    'mi_notif_email_habilitado',
  )
  if (notifError) return handleError(notifError)

  return jsonOk({ ...data, notif_email_habilitado: notifEmailHabilitado })
}
