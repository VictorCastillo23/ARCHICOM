import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { currentPassword, newPassword } = body as {
    currentPassword?: string
    newPassword?: string
  }

  if (!currentPassword || !newPassword) {
    return validationError('currentPassword y newPassword son requeridos')
  }
  if (newPassword.length < 8) {
    return validationError('La contraseña debe tener al menos 8 caracteres.')
  }
  if (newPassword.length > 72) {
    return validationError('La contraseña no puede superar 72 caracteres.')
  }
  if (newPassword === currentPassword) {
    return validationError('La nueva contraseña debe ser distinta de la actual.')
  }

  // Re-authenticate: updateUser does NOT verify the current password on its own.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (reauthError) {
    return validationError('La contraseña actual es incorrecta.')
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return handleError(error)

  return jsonOk({ success: true })
}
