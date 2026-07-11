import { getCorreosAdmin } from '@/lib/data/correos'
import AdminCorreoForm from '@/components/admin/AdminCorreoForm'
import AdminCorreoHistorial from '@/components/admin/AdminCorreoHistorial'
import Pagination from '@/components/ui/Pagination'

export const metadata = { title: 'Correos' }
export const dynamic = 'force-dynamic'

const LIMIT = 10

export default async function AdminCorreosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  const offset = Number(sp.offset ?? 0)

  const { correos, hasMore } = await getCorreosAdmin({ limit: LIMIT, offset })

  return (
    <div className="max-w-2xl animate-page">
      <div className="mb-8 pb-6 border-b-2 border-primary">
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">
          Comunicación
        </p>
        <h1 className="text-(length:--size-heading-lg) font-display font-normal leading-tight text-text">
          Correos
        </h1>
        <p className="mt-2 text-text-muted">
          Envía correos personalizados a los usuarios de la plataforma.
        </p>
      </div>

      <AdminCorreoForm />

      <div className="mt-8">
        <h2 className="font-semibold text-lg mb-3 text-text">Historial reciente</h2>
        <AdminCorreoHistorial correos={correos} />
        <Pagination
          basePath="/admin/correos"
          searchParams={{}}
          offset={offset}
          limit={LIMIT}
          hasMore={hasMore}
        />
      </div>
    </div>
  )
}
