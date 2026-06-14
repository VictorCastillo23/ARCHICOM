import type { TipoPublicacion } from '@/lib/types/database'
import Badge from './Badge'
import { TIPO_META } from '@/lib/constants/publicaciones'

export interface TipoBadgeProps {
  tipo: TipoPublicacion
}

export default function TipoBadge({ tipo }: TipoBadgeProps) {
  const { tone, label } = TIPO_META[tipo]
  return <Badge tone={tone}>{label}</Badge>
}
