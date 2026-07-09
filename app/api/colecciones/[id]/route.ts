import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { getColeccion } from '@/lib/data/colecciones'
import type { Coleccion, VisibilidadColeccion } from '@/lib/types/database'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

const VISIBILIDADES: VisibilidadColeccion[] = ['publica', 'privada']

function coleccionNotFound(): NextResponse {
  return NextResponse.json(
    { error: { code: 'not_found', message: 'Esta colección no existe' } },
    { status: 404 }
  )
}

// Auth optional: RLS (coleccion_select) already restricts rows to
// publica-or-owner; .maybeSingle() turns a 0-row (private, non-owner) result
// into null instead of throwing.
export async function GET(_request: Request, ctx: Context) {
  const { id } = await ctx.params

  const { data, error } = await getColeccion(id)
  if (error) return handleError(error)

  if (!data) return coleccionNotFound()

  return jsonOk(data)
}

export async function PATCH(request: Request, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const { titulo, descripcion, visibilidad } = body as {
    titulo?: string
    descripcion?: string | null
    visibilidad?: VisibilidadColeccion
  }

  const updateObj: Record<string, unknown> = {}

  if (titulo !== undefined) {
    if (typeof titulo !== 'string' || titulo.length === 0) {
      return validationError('titulo no puede estar vacío')
    }
    if (titulo.length > 100) {
      return validationError('El titulo no puede superar 100 caracteres')
    }
    updateObj.titulo = titulo
  }

  if (descripcion !== undefined) {
    if (descripcion !== null && typeof descripcion !== 'string') {
      return validationError('descripcion debe ser texto')
    }
    if (typeof descripcion === 'string' && descripcion.length > 500) {
      return validationError('La descripcion no puede superar 500 caracteres')
    }
    updateObj.descripcion = descripcion
  }

  if (visibilidad !== undefined) {
    if (!VISIBILIDADES.includes(visibilidad)) {
      return validationError('visibilidad debe ser "publica" o "privada"')
    }
    updateObj.visibilidad = visibilidad
  }

  if (Object.keys(updateObj).length === 0) {
    return validationError('No hay campos para actualizar')
  }

  const { data, error } = await supabase
    .from('coleccion')
    .update(updateObj)
    .eq('id', id)
    .eq('usuario_id', user.id)
    .select('id, usuario_id, titulo, descripcion, visibilidad, creado_en')
    .maybeSingle()

  if (error) return handleError(error)

  if (!data) return coleccionNotFound()

  return jsonOk<Coleccion>(data)
}

export async function DELETE(_request: Request, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: deleted, error } = await supabase
    .from('coleccion')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) return handleError(error)

  if (!deleted) return coleccionNotFound()

  return jsonOk(null)
}
