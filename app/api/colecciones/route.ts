import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import type { Coleccion, VisibilidadColeccion } from '@/lib/types/database'

const VISIBILIDADES: VisibilidadColeccion[] = ['publica', 'privada']

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const { titulo, descripcion, visibilidad } = body as {
    titulo?: string
    descripcion?: string
    visibilidad?: VisibilidadColeccion
  }

  if (typeof titulo !== 'string' || titulo.length === 0) {
    return validationError('Se requiere titulo')
  }
  if (titulo.length > 100) {
    return validationError('El titulo no puede superar 100 caracteres')
  }
  if (descripcion !== undefined) {
    if (typeof descripcion !== 'string') {
      return validationError('descripcion debe ser texto')
    }
    if (descripcion.length > 500) {
      return validationError('La descripcion no puede superar 500 caracteres')
    }
  }
  if (visibilidad !== undefined && !VISIBILIDADES.includes(visibilidad)) {
    return validationError('visibilidad debe ser "publica" o "privada"')
  }

  const { data, error } = await supabase
    .from('coleccion')
    .insert({
      usuario_id: user.id,
      titulo,
      descripcion: descripcion ?? null,
      visibilidad: visibilidad ?? 'privada',
    })
    .select('id, usuario_id, titulo, descripcion, visibilidad, creado_en')
    .single()

  if (error) return handleError(error)

  return jsonOk<Coleccion>(data, 201)
}

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data, error } = await supabase
    .from('coleccion')
    .select('id, usuario_id, titulo, descripcion, visibilidad, creado_en')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })

  if (error) return handleError(error)

  return jsonOk<Coleccion[]>(data ?? [])
}
