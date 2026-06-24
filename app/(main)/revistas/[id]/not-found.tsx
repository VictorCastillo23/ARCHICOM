import EmptyState from '@/components/ui/EmptyState'

export default function RevistaNotFound() {
  return (
    <EmptyState
      title="Revista no encontrada"
      description="Esta revista no existe o aún no fue publicada."
      action={{ label: 'Ver revistas', href: '/revistas' }}
    />
  )
}
