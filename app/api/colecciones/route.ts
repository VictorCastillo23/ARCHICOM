import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import type { Coleccion, ColeccionConMembership, VisibilidadColeccion } from '@/lib/types/database'

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

// `publicacion_id` es opcional: cuando viene, cada colección incluye `agregada`
// (si ya contiene esa publicación) — lo consume AgregarAColeccionButton para
// no mostrar "Agregar" en colecciones que ya la tienen al reabrir el modal.
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const publicacionId = new URL(request.url).searchParams.get('publicacion_id')

  const { data, error } = await supabase
    .from('coleccion')
    .select('id, usuario_id, titulo, descripcion, visibilidad, creado_en')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })

  if (error) return handleError(error)

  const colecciones = data ?? []

  if (!publicacionId) {
    return jsonOk<Coleccion[]>(colecciones)
  }

  if (colecciones.length === 0) {
    return jsonOk<ColeccionConMembership[]>([])
  }

  const { data: miembros, error: miembrosError } = await supabase
    .from('coleccion_publicacion')
    .select('coleccion_id')
    .eq('publicacion_id', publicacionId)
    .in(
      'coleccion_id',
      colecciones.map((c) => c.id)
    )

  if (miembrosError) return handleError(miembrosError)

  const agregadas = new Set((miembros ?? []).map((m) => m.coleccion_id))
  const conMembership: ColeccionConMembership[] = colecciones.map((c) => ({
    ...c,
    agregada: agregadas.has(c.id),
  }))

  return jsonOk<ColeccionConMembership[]>(conMembership)
}
