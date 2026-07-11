import { type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import {
  validateAsunto,
  validateCuerpo,
  validateDestinatariosCriterio,
} from '@/lib/validation/correoAdmin'
import type { CorreoAdminDetalle, EstadoCorreoAdmin } from '@/lib/types/database'

// The bulk send (`enviar-correo-masivo`) can take a while for up to 500
// recipients batched 50 at a time — same generous budget as the RAG backfill.
export const maxDuration = 120

const SELECT_CORREO_DETALLE =
  'id, admin_id, asunto, cuerpo, destinatarios_criterio, cantidad_destinatarios, ' +
  'cantidad_enviados, cantidad_fallidos, estado, enviado_en, ' +
  'admin:usuario!correo_admin_admin_id_fkey(id, nombre)'

type EnviarCorreoMasivoResponse = {
  enviados: number
  fallidos: number
  detalles: { email: string; error?: string }[]
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { searchParams } = request.nextUrl

  const MAX_LIMIT = 50
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const limit =
    limitParam === null
      ? 10
      : Math.min(Math.max(Math.trunc(Number(limitParam)) || 10, 1), MAX_LIMIT)
  const offset =
    offsetParam === null ? 0 : Math.max(Math.trunc(Number(offsetParam)) || 0, 0)

  const { data, error } = await admin.supabase
    .from('correo_admin')
    .select(SELECT_CORREO_DETALLE)
    .order('enviado_en', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return handleError(error)

  const correos = data as unknown as CorreoAdminDetalle[]
  return jsonOk({ correos, hasMore: correos.length === limit })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const body = await request.json().catch(() => ({}))
  const { asunto: rawAsunto, cuerpo: rawCuerpo, destinatarios_criterio: rawCriterio } = body as {
    asunto?: unknown
    cuerpo?: unknown
    destinatarios_criterio?: unknown
  }

  const asunto = validateAsunto(rawAsunto)
  if (!asunto) return validationError('asunto es requerido (1-200 caracteres)')

  const cuerpo = validateCuerpo(rawCuerpo)
  if (!cuerpo) return validationError('cuerpo es requerido (10-5000 caracteres)')

  const destinatariosCriterio = validateDestinatariosCriterio(rawCriterio)
  if (!destinatariosCriterio) return validationError('destinatarios_criterio inválido')

  const { data: inserted, error: insertError } = await admin.supabase
    .from('correo_admin')
    .insert({
      // admin_id ALWAYS from session — never from body
      admin_id: admin.user.id,
      asunto,
      cuerpo,
      destinatarios_criterio: destinatariosCriterio,
      estado: 'pendiente',
    })
    .select(SELECT_CORREO_DETALLE)
    .single()

  if (insertError) return handleError(insertError)

  const correo = inserted as unknown as CorreoAdminDetalle

  const { data: invokeData, error: invokeError } = await admin.supabase.functions.invoke(
    'enviar-correo-masivo',
    { body: { asunto, cuerpo, destinatarios_criterio: destinatariosCriterio } },
  )

  if (invokeError) {
    await admin.supabase.from('correo_admin').update({ estado: 'fallido' }).eq('id', correo.id)
    return handleError(invokeError)
  }

  const { enviados, fallidos, detalles } = invokeData as EnviarCorreoMasivoResponse
  const cantidadDestinatarios = detalles.length
  const estado: EstadoCorreoAdmin =
    fallidos > 0 && enviados === 0 && cantidadDestinatarios > 0 ? 'fallido' : 'completado'

  const { data: updated, error: updateError } = await admin.supabase
    .from('correo_admin')
    .update({
      cantidad_destinatarios: cantidadDestinatarios,
      cantidad_enviados: enviados,
      cantidad_fallidos: fallidos,
      estado,
    })
    .eq('id', correo.id)
    .select(SELECT_CORREO_DETALLE)
    .single()

  if (updateError) return handleError(updateError)

  return jsonOk(
    { correo: updated as unknown as CorreoAdminDetalle, detalles },
    201,
  )
}
