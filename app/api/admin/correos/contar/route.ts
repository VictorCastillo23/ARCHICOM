import { requireAdmin } from '@/lib/auth/requireAdmin'
import { handleError, jsonOk, validationError } from '@/lib/supabase/handleError'
import { validateDestinatariosCriterio } from '@/lib/validation/correoAdmin'

// Preview-only: resolves how many recipients a criterio would hit (same RPC
// the Edge Function uses internally) without sending anything or writing to
// correo_admin. Backs the "Ver vista previa" step in AdminCorreoForm.
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const body = await request.json().catch(() => ({}))
  const criterio = validateDestinatariosCriterio(
    (body as { destinatarios_criterio?: unknown }).destinatarios_criterio,
  )
  if (!criterio) return validationError('destinatarios_criterio inválido')

  const { data, error } = await admin.supabase.rpc('resolver_destinatarios_correo', {
    p_tipo: criterio.tipo,
    p_ciudad: criterio.tipo === 'ciudad' ? criterio.valor : null,
    p_ids: criterio.tipo === 'ids' ? criterio.valor : null,
  })

  if (error) return handleError(error)

  return jsonOk({ cantidad: (data ?? []).length })
}
