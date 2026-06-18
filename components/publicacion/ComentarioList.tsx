import Link from 'next/link'
import type { Comentario, Usuario } from '@/lib/types/database'

export interface ComentarioListProps {
  comentarios: (Comentario & { usuario?: Pick<Usuario, 'id' | 'nombre'> | null })[]
}

export default function ComentarioList({ comentarios }: ComentarioListProps) {
  if (comentarios.length === 0) {
    return (
      <p className="text-sm text-text-muted italic">
        Sé el primero en comentar.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-4 list-none p-0">
      {comentarios.map((comentario) => (
        <li
          key={comentario.id}
          className="border-b border-border pb-4 last:border-b-0 last:pb-0"
        >
          <div className="flex items-center gap-2 mb-1">
            {comentario.usuario ? (
              <Link
                href={`/usuario/${comentario.usuario.id}`}
                className="text-sm font-medium text-text hover:text-primary transition-colors"
              >
                {comentario.usuario.nombre}
              </Link>
            ) : (
              <span className="text-sm font-medium text-text">
                Usuario eliminado
              </span>
            )}
            <time
              dateTime={comentario.creado_en}
              className="text-xs text-text-muted"
            >
              {new Date(comentario.creado_en).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </div>
          <p className="text-sm text-text leading-relaxed">
            {comentario.contenido}
          </p>
        </li>
      ))}
    </ul>
  )
}
