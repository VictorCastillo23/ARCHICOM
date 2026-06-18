import Link from 'next/link'
import Card from '@/components/ui/Card'

export const metadata = { title: 'Admin' }

export default function AdminPage() {
  return (
    <div className="max-w-2xl animate-page">
      <div className="mb-8 pb-6 border-b-2 border-primary">
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">
          Panel de administración
        </p>
        <h1 className="text-(length:--size-heading-lg) font-display font-normal leading-tight text-text">
          Vitrina
        </h1>
        <p className="mt-2 text-text-muted">
          Gestioná las revistas y el catálogo de tags.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger">
        <Link href="/admin/revistas" className="block group">
          <Card className="group-hover:shadow-md transition-shadow h-full border-l-4 border-l-primary">
            <h2 className="font-display font-normal text-(length:--size-heading-sm) mb-1">Revistas</h2>
            <p className="text-sm text-text-muted">
              Crear y editar revistas, curar artículos, gestionar solicitudes.
            </p>
          </Card>
        </Link>

        <Link href="/admin/tags" className="block group">
          <Card className="group-hover:shadow-md transition-shadow h-full border-l-4 border-l-primary">
            <h2 className="font-display font-normal text-(length:--size-heading-sm) mb-1">Tags</h2>
            <p className="text-sm text-text-muted">
              Crear, editar y eliminar tags del catálogo público.
            </p>
          </Card>
        </Link>

        <Link href="/admin/reportes" className="block group">
          <Card className="group-hover:shadow-md transition-shadow h-full border-l-4 border-l-primary">
            <h2 className="font-display font-normal text-(length:--size-heading-sm) mb-1">Reportes</h2>
            <p className="text-sm text-text-muted">
              Revisá y moderá publicaciones reportadas.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
