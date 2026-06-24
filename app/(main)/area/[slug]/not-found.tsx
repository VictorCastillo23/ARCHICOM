import EmptyState from '@/components/ui/EmptyState'

export default function AreaNotFound() {
  return (
    <EmptyState
      title="Área no encontrada"
      description="Esta área de conocimiento no existe o todavía no tiene suficientes publicaciones."
      action={{ label: 'Ver todas las áreas', href: '/areas' }}
    />
  )
}
