import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'
import { getNotificaciones } from '@/lib/data/notificaciones'

const MAX_LIMIT = 50

// Paginated notification list for the current session user. `?filtro=no-leidas`
// restricts to unread rows; any other/missing value returns all (RLS-scoped) rows.
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const filtro = searchParams.get('filtro') === 'no-leidas' ? 'no-leidas' : undefined

  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, MAX_LIMIT)
  const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset

  const { data, error } = await getNotificaciones({ filtro, limit, offset })
  if (error) return handleError(error)

  return jsonOk(data)
}
