import { requireAdmin } from '@/lib/auth/requireAdmin'
import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import { validateDestinatariosCriterio } from '@/lib/validation/correoAdmin'
import { resolverCriterioEnvio } from '@/lib/data/correos'
import type { DestinatarioResuelto } from '@/lib/types/database'

// Preview-only: resolves who a criterio would hit (same RPC the Edge Function
// uses internally) without sending anything or writing to correo_admin.
// Backs the "Ver vista previa" step in AdminCorreoForm, including the
// expandable recipient list — the admin already sees these same
// email/nombre pairs post-send in the `detalles` of a completed correo_admin
// row, so surfacing them here isn't a new exposure.
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const body = await request.json().catch(() => ({}))
  const criterio = validateDestinatariosCriterio(
    (body as { destinatarios_criterio?: unknown }).destinatarios_criterio,
  )
  if (!criterio) return validationError('destinatarios_criterio inválido')

  const { criterio: resuelto, error: resolveError } = await resolverCriterioEnvio(
    admin.supabase,
    criterio,
  )
  if (resolveError) return handleError(resolveError)

  const { data, error } = await admin.supabase.rpc('resolver_destinatarios_correo', {
    p_tipo: resuelto.tipo,
    p_ciudad: resuelto.tipo === 'ciudad' ? resuelto.valor : null,
    p_ids: resuelto.tipo === 'ids' ? resuelto.valor : null,
  })

  if (error) return handleError(error)

  const destinatarios = (data ?? []) as DestinatarioResuelto[]
  return jsonOk({ cantidad: destinatarios.length, destinatarios })
}
