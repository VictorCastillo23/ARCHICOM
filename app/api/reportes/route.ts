import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { MOTIVOS_REPORTE } from '@/lib/types/database'
import type { EstadoReporte, MotivoReporte } from '@/lib/types/database'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const { publicacion_id, motivo, detalle } = body as {
    publicacion_id?: string
    motivo?: string
    detalle?: string
  }

  if (!publicacion_id) {
    return validationError('Se requiere publicacion_id')
  }

  if (!motivo || !(MOTIVOS_REPORTE as string[]).includes(motivo)) {
    return validationError(
      `motivo debe ser uno de: ${MOTIVOS_REPORTE.join(', ')}`,
    )
  }

  if (detalle && detalle.length > 500) {
    return validationError('detalle no puede superar los 500 caracteres')
  }

  const { data, error } = await supabase
    .from('reporte')
    .insert({
      publicacion_id,
      motivo: motivo as MotivoReporte,
      detalle: detalle ?? null,
      // reportante_id ALWAYS from session — never from body
      reportante_id: user.id,
    })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk({ reporte: data }, 201)
}

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { searchParams } = new URL(request.url)
  const estado = (searchParams.get('estado') ?? undefined) as EstadoReporte | undefined

  let query = admin.supabase
    .from('reporte')
    .select(
      '*, publicacion!reporte_publicacion_id_fkey(id, titulo), reportante:usuario!reporte_reportante_id_fkey(id, nombre)',
    )
    .order('creado_en', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return handleError(error)

  return NextResponse.json({ data: { reportes: data } }, { status: 200 })
}
