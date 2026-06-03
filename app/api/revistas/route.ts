import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import { getRevistas } from '@/lib/data/revistas'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado') ?? undefined

  const { data, error } = await getRevistas({ estado })
  if (error) return handleError(error)

  return jsonOk({ revistas: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const body = await request.json()
  const { titulo, volumen } = body

  if (!titulo) return validationError('Se requiere titulo')

  const { data, error } = await admin.supabase
    .from('revista')
    .insert({
      titulo,
      volumen: volumen ?? null,
      estado: 'borrador',
      editor_id: admin.user.id,
    })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ revista: data }, 201)
}
