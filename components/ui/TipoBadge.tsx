import type { TipoPublicacion } from '@/lib/types/database'
import Badge, { type BadgeTone } from './Badge'

export interface TipoBadgeProps {
  tipo: TipoPublicacion
}

const tipoMap: Record<TipoPublicacion, { tone: BadgeTone; label: string }> = {
  libro:         { tone: 'info',    label: 'Libro' },
  articulo:      { tone: 'success', label: 'Artículo' },
  investigacion: { tone: 'warning', label: 'Investigación' },
  poema:         { tone: 'accent',  label: 'Poema' },
  dibujo:        { tone: 'danger',  label: 'Dibujo' },
  otro:          { tone: 'neutral', label: 'Otro' },
}

export default function TipoBadge({ tipo }: TipoBadgeProps) {
  const { tone, label } = tipoMap[tipo]
  return <Badge tone={tone}>{label}</Badge>
}
