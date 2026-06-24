import EmptyState from '@/components/ui/EmptyState'

export default function PublicacionNotFound() {
  return (
    <EmptyState
      title="Publicación no encontrada"
      description="Esta publicación no existe o fue eliminada."
      action={{ label: 'Volver al inicio', href: '/' }}
    />
  )
}
