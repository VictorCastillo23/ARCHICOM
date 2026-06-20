import type { TipoPublicacion } from '@/lib/types/database'
import type { BadgeTone } from '@/components/ui/Badge'

/**
 * Single source of truth for publication types.
 *
 * Adding a value to the `TipoPublicacion` union forces an entry here (the Record
 * is exhaustive — tsc errors otherwise), and every derived list below updates
 * automatically. Key order = display order in the UI (form select, feed filters).
 * `Object.keys` preserves insertion order for string keys (ES2015+).
 *
 * `BadgeTone` is imported as a type only, so this module pulls no UI runtime into
 * the bundle and is safe to import from server route handlers.
 */
export const TIPO_META: Record<TipoPublicacion, { label: string; tone: BadgeTone }> = {
  libro:         { label: 'Libro',         tone: 'info'    },
  articulo:      { label: 'Artículo',      tone: 'success' },
  investigacion: { label: 'Investigación', tone: 'warning' },
  ensayo:        { label: 'Ensayo',        tone: 'success' },
  cuento:        { label: 'Cuento',        tone: 'accent'  },
  poema:         { label: 'Poema',         tone: 'accent'  },
  resena:        { label: 'Reseña',        tone: 'info'    },
  tesis:         { label: 'Tesis',         tone: 'warning' },
  ponencia:      { label: 'Ponencia',      tone: 'warning' },
  proyecto:      { label: 'Proyecto',      tone: 'info'    },
  dibujo:         { label: 'Dibujo',          tone: 'danger'  },
  ilustracion:    { label: 'Ilustración',     tone: 'danger'  },
  pintura:        { label: 'Pintura',         tone: 'accent'  },
  diseno_grafico: { label: 'Diseño gráfico',  tone: 'info'    },
  diseno_modas:   { label: 'Diseño de modas', tone: 'warning' },
  fotografia:     { label: 'Fotografía',      tone: 'danger'  },
  infografia:     { label: 'Infografía',      tone: 'success' },
  recomendacion:  { label: 'Recomendación',   tone: 'accent'  },
  otro:          { label: 'Otro',          tone: 'neutral' },
}

export const TIPOS_PUBLICACION = Object.keys(TIPO_META) as TipoPublicacion[]
