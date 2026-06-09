import { handleError, jsonOk } from '@/lib/supabase/handleError'
import { getRevistas } from '@/lib/data/revistas'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado') ?? undefined

  const { data, error } = await getRevistas({ estado })
  if (error) return handleError(error)

  return jsonOk({ revistas: data })
}
