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
    .select('id, nombre, rol, institucion, carrera, ciudad, creado_en')
    .eq('id', user.id)
    .single()

  if (error) return handleError(error)

  // notif_email_habilitado is column-grant-blocked from direct SELECT (see
  // BD §3.21 — a plain column GRANT to `authenticated` would leak this
  // preference across users, since usuario's SELECT policy is row-public,
  // not row-scoped). Read via the self-scoped RPC instead.
  const { data: notifEmailHabilitado, error: notifError } = await supabase.rpc(
    'mi_notif_email_habilitado',
  )
  if (notifError) return handleError(notifError)

  return jsonOk({ user, perfil: { ...data, notif_email_habilitado: notifEmailHabilitado } })
}
