import type { TipoPublicacion } from '@/lib/types/database'
import type { BadgeTone } from '@/components/ui/Badge'

/**
 * Frontend-only grouping for the 19 publication types. NOT a DB column — it never
 * travels in any payload. It exists so the publish UI can show a grouped, type-first
 * picker instead of a flat 19-item <select>.
 */
export type CategoriaTipo = 'texto' | 'visual' | 'recomendacion' | 'otro'

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
export const TIPO_META: Record<
  TipoPublicacion,
  { label: string; tone: BadgeTone; categoria: CategoriaTipo }
> = {
  libro:         { label: 'Libro',         tone: 'info',    categoria: 'texto'  },
  articulo:      { label: 'Artículo',      tone: 'success', categoria: 'texto'  },
  investigacion: { label: 'Investigación', tone: 'warning', categoria: 'texto'  },
  ensayo:        { label: 'Ensayo',        tone: 'success', categoria: 'texto'  },
  cuento:        { label: 'Cuento',        tone: 'accent',  categoria: 'texto'  },
  poema:         { label: 'Poema',         tone: 'accent',  categoria: 'texto'  },
  resena:        { label: 'Reseña',        tone: 'info',    categoria: 'texto'  },
  tesis:         { label: 'Tesis',         tone: 'warning', categoria: 'texto'  },
  ponencia:      { label: 'Ponencia',      tone: 'warning', categoria: 'texto'  },
  proyecto:      { label: 'Proyecto',      tone: 'info',    categoria: 'texto'  },
  dibujo:         { label: 'Dibujo',          tone: 'danger',  categoria: 'visual' },
  ilustracion:    { label: 'Ilustración',     tone: 'danger',  categoria: 'visual' },
  pintura:        { label: 'Pintura',         tone: 'accent',  categoria: 'visual' },
  diseno_grafico: { label: 'Diseño gráfico',  tone: 'info',    categoria: 'visual' },
  diseno_modas:   { label: 'Diseño de modas', tone: 'warning', categoria: 'visual' },
  fotografia:     { label: 'Fotografía',      tone: 'danger',  categoria: 'visual' },
  infografia:     { label: 'Infografía',      tone: 'success', categoria: 'visual' },
  recomendacion:  { label: 'Recomendación',   tone: 'accent',  categoria: 'recomendacion' },
  otro:          { label: 'Otro',          tone: 'neutral', categoria: 'otro'   },
}

export const TIPOS_PUBLICACION = Object.keys(TIPO_META) as TipoPublicacion[]

/**
 * Group headers for the publish picker. `orden` controls display order of the groups.
 */
export const CATEGORIA_META: Record<CategoriaTipo, { label: string; orden: number }> = {
  texto:         { label: 'Texto y académico', orden: 0 },
  visual:        { label: 'Arte y visual',     orden: 1 },
  recomendacion: { label: 'Recomendación',     orden: 2 },
  otro:          { label: 'Otro',              orden: 3 },
}

/**
 * Types grouped by category, in category display order, preserving the insertion
 * order of `TIPO_META` within each group. Derived once so the picker doesn't recompute.
 */
export const TIPOS_POR_CATEGORIA: { categoria: CategoriaTipo; tipos: TipoPublicacion[] }[] =
  (Object.keys(CATEGORIA_META) as CategoriaTipo[])
    .sort((a, b) => CATEGORIA_META[a].orden - CATEGORIA_META[b].orden)
    .map((categoria) => ({
      categoria,
      tipos: TIPOS_PUBLICACION.filter((tipo) => TIPO_META[tipo].categoria === categoria),
    }))
