import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'

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

  const updates: Record<string, string> = {}
  if (institucion !== undefined) updates.institucion = institucion
  if (carrera !== undefined) updates.carrera = carrera
  if (nombre !== undefined) updates.nombre = nombre

  const { data, error } = await supabase
    .from('usuario')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk(data)
}
