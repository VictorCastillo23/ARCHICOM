import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { handleError, jsonOk } from '@/lib/supabase/handleError'
import type { CorreoAdminDetalle } from '@/lib/types/database'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error

  const { id } = await ctx.params

  const { data, error } = await admin.supabase
    .from('correo_admin')
    .select(
      'id, admin_id, asunto, cuerpo, destinatarios_criterio, cantidad_destinatarios, ' +
        'cantidad_enviados, cantidad_fallidos, estado, enviado_en, ' +
        'admin:usuario!correo_admin_admin_id_fkey(id, nombre)',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return handleError(error)
  if (!data) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Correo no encontrado' } },
      { status: 404 },
    )
  }

  return jsonOk({ correo: data as unknown as CorreoAdminDetalle })
}
