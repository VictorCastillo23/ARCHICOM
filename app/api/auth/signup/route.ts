import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, nombre } = body as {
    email?: string
    password?: string
    nombre?: string
  }

  if (!email || !password || !nombre) {
    return validationError('email, password y nombre son requeridos')
  }

  if (nombre.length > 50) return validationError('El nombre no puede superar 50 caracteres.')
  if (email.length > 254) return validationError('El email no puede superar 254 caracteres.')
  if (password.length < 8) return validationError('La contraseña debe tener al menos 8 caracteres.')
  if (password.length > 72) return validationError('La contraseña no puede superar 72 caracteres.')

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) return handleError(error)

  // With email confirmation enabled, signUp never returns a session — neither
  // for a brand-new account nor for an already-registered email (the latter is
  // an anti-enumeration decoy). Absence of a session is the correct signal that
  // the user must confirm via email, and it doesn't leak whether the email
  // already existed.
  return jsonOk({ user: data.user, needsConfirmation: data.session === null }, 201)
}
