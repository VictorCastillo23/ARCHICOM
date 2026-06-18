import ReportesList from '@/components/admin/reportes/ReportesList'

export const metadata = { title: 'Reportes' }

export default function ReportesPage() {
  return (
    <div className="max-w-2xl animate-page">
      <div className="mb-8 pb-6 border-b-2 border-primary">
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">
          Moderación
        </p>
        <h1 className="text-(length:--size-heading-lg) font-display font-normal leading-tight text-text">
          Reportes
        </h1>
        <p className="mt-2 text-text-muted">
          Revisá las publicaciones reportadas por la comunidad.
        </p>
      </div>

      <ReportesList />
    </div>
  )
}
