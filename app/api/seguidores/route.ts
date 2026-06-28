import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { getSeguidores, getSeguidos } from '@/lib/data/seguidores'

const MAX_LIMIT = 50

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { seguido_id } = body

  if (!seguido_id) {
    return validationError('Se requiere seguido_id')
  }

  // Pre-check: prevent self-follow at app layer (DB CHECK is defense-in-depth only)
  if (seguido_id === user.id) {
    return validationError('No puedes seguirte a ti mismo')
  }

  const { error } = await supabase
    .from('seguidor')
    .insert({ seguidor_id: user.id, seguido_id })

  if (error) return handleError(error)

  return jsonOk(null, 201)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const usuario_id = searchParams.get('usuario_id')
  if (!usuario_id) {
    return validationError('Se requiere usuario_id')
  }

  const tipo = searchParams.get('tipo') ?? 'seguidores'
  if (tipo !== 'seguidores' && tipo !== 'seguidos') {
    return validationError('tipo debe ser "seguidores" o "seguidos"')
  }

  const rawLimit = parseInt(searchParams.get('limit') ?? '10', 10)
  const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, MAX_LIMIT)
  const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset

  const { data, error } =
    tipo === 'seguidores'
      ? await getSeguidores(usuario_id, { limit, offset })
      : await getSeguidos(usuario_id, { limit, offset })

  if (error) return handleError(error)

  return jsonOk({ usuarios: data ?? [] })
}
