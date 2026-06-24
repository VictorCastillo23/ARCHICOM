import EmptyState from '@/components/ui/EmptyState'

export default function UsuarioNotFound() {
  return (
    <EmptyState
      title="Perfil no encontrado"
      description="Este usuario no existe o ya no está disponible."
      action={{ label: 'Volver al inicio', href: '/' }}
    />
  )
}
