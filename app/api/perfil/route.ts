import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { institucion, carrera, nombre } = body as {
    institucion?: string
    carrera?: string
    nombre?: string
  }

  if (nombre !== undefined && nombre.length > 50)
    return validationError('El nombre no puede superar 50 caracteres.')
  if (institucion !== undefined && institucion.length > 50)
    return validationError('La institución no puede superar 50 caracteres.')
  if (carrera !== undefined && carrera.length > 50)
    return validationError('La carrera no puede superar 50 caracteres.')

  const updates: Record<string, string> = {}
  if (institucion !== undefined) updates.institucion = institucion
  if (carrera !== undefined) updates.carrera = carrera
  if (nombre !== undefined) updates.nombre = nombre

  const { data, error } = await supabase
    .from('usuario')
    .update(updates)
    .eq('id', user.id)
    .select('id, nombre, rol, institucion, carrera, creado_en')
    .single()

  if (error) return handleError(error)

  return jsonOk(data)
}
