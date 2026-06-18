import { createClient } from '@/lib/supabase/server'
import type { ReporteConDetalle } from '@/lib/types/database'

/**
 * Server-only helper: returns all pending reports with embedded publicacion + reportante.
 * Uses the explicit FK hint for the reportante embed because usuario is referenced
 * twice from reporte (reportante_id and revisor_id) and PostgREST needs disambiguation.
 *
 * NOTE: the live admin moderation screen uses the GET /api/reportes route (client fetch,
 * ADR-5). This helper exists for SSR / testing scenarios.
 */
export async function getReportesPendientes(): Promise<{
  data: ReporteConDetalle[] | null
  error: unknown
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reporte')
    .select(
      '*, publicacion!reporte_publicacion_id_fkey(id, titulo), reportante:usuario!reporte_reportante_id_fkey(id, nombre)',
    )
    .eq('estado', 'pendiente')
    .order('creado_en', { ascending: false })

  return { data: data as ReporteConDetalle[] | null, error }
}
