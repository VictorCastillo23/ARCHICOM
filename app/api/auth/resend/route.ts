import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'

export async function POST(request: Request) {
  const body = await request.json()
  const { email } = body as { email?: string }

  if (!email) {
    return validationError('email es requerido')
  }

  const supabase = await createClient()

  // Resend the signup confirmation email. Supabase Auth rate-limits this
  // endpoint (429 → mapped by handleError) and does not reveal whether the
  // address is already registered/confirmed, so it is safe to expose.
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) return handleError(error)

  return jsonOk({ sent: true })
}
