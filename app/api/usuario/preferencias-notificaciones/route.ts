import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import type { PreferenciasNotifApp } from '@/lib/types/database'

const PREF_KEYS = [
  'notif_app_comentarios',
  'notif_app_seguidores',
  'notif_app_revista',
  'notif_app_mensajes',
  'notif_app_likes',
] as const satisfies readonly (keyof PreferenciasNotifApp)[]

// Updates 1+ of the 5 notif_app_* booleans. Deliberately does NOT chain
// .select() after .update() (Decision 5): these columns have no SELECT grant
// at all (see BD §3.22 / lib/data/perfil.ts getPreferenciasNotifApp), so a
// chained .select() would trip a permission error even though the UPDATE
// itself succeeds. The response instead echoes back the validated input.
export async function PATCH(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const raw = body as Partial<Record<(typeof PREF_KEYS)[number], unknown>>

  const updates: Partial<PreferenciasNotifApp> = {}
  for (const key of PREF_KEYS) {
    const value = raw[key]
    if (value === undefined) continue
    if (typeof value !== 'boolean') {
      return validationError(`${key} debe ser verdadero o falso`)
    }
    updates[key] = value
  }

  if (Object.keys(updates).length === 0) {
    return validationError('Se requiere al menos una preferencia de notificación')
  }

  const { error } = await supabase.from('usuario').update(updates).eq('id', user.id)

  if (error) return handleError(error)

  return jsonOk(updates)
}
