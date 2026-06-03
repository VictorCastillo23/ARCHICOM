import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'
import { getMisSolicitudes } from '@/lib/data/solicitudes'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data, error } = await getMisSolicitudes(user.id)
  if (error) return handleError(error)

  return jsonOk({ solicitudes: data })
}
