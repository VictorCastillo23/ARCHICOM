import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import { getTags } from '@/lib/data/tags'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET() {
  const { data, error } = await getTags()
  if (error) return handleError(error)

  return jsonOk({ tags: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const body = await request.json()
  const { nombre, area } = body

  if (!nombre || !area) return validationError('Se requieren nombre y area')

  const { data, error } = await admin.supabase
    .from('tag')
    .insert({ nombre, area })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ tag: data }, 201)
}
