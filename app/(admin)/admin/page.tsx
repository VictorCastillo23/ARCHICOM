import Link from 'next/link'
import Card from '@/components/ui/Card'

export const metadata = { title: 'Admin' }

export default function AdminPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Panel de administración</h1>
      <p className="text-[--color-text-muted] mb-8">Gestioná las revistas y el catálogo de tags.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/revistas" className="block group">
          <Card className="group-hover:shadow-md transition-shadow h-full">
            <h2 className="font-semibold text-lg mb-1">Revistas</h2>
            <p className="text-sm text-[--color-text-muted]">
              Crear y editar revistas, curar artículos, gestionar solicitudes.
            </p>
          </Card>
        </Link>

        <Link href="/admin/tags" className="block group">
          <Card className="group-hover:shadow-md transition-shadow h-full">
            <h2 className="font-semibold text-lg mb-1">Tags</h2>
            <p className="text-sm text-[--color-text-muted]">
              Crear, editar y eliminar tags del catálogo público.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
