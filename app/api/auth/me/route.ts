import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, rol, institucion, carrera, creado_en')
    .eq('id', user.id)
    .single()

  if (error) return handleError(error)

  return jsonOk({ user, perfil: data })
}
