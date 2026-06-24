'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ComentarioForm from '@/components/publicacion/ComentarioForm'
import type { ComentarioArbol, ComentarioConUsuario } from '@/lib/types/database'

export interface ComentarioListProps {
  comentarios: ComentarioArbol[]
  publicacionId: string
  isAuthenticated: boolean
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ComentarioAutor({ usuario }: { usuario: ComentarioConUsuario['usuario'] }) {
  if (!usuario) {
    return <span className="text-sm font-medium text-text">Usuario eliminado</span>
  }
  return (
    <Link
      href={`/usuario/${usuario.id}`}
      className="text-sm font-medium text-text hover:text-primary transition-colors"
    >
      {usuario.nombre}
    </Link>
  )
}

export default function ComentarioList({ comentarios, publicacionId, isAuthenticated }: ComentarioListProps) {
  const router = useRouter()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

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
          {/* Root comment header */}
          <div className="flex items-center gap-2 mb-1">
            <ComentarioAutor usuario={comentario.usuario} />
            <time dateTime={comentario.creado_en} className="text-xs text-text-muted">
              {formatDate(comentario.creado_en)}
            </time>
          </div>

          {/* Root comment content */}
          <p className="text-sm text-text leading-relaxed">
            {comentario.contenido}
          </p>

          {/* Reply toggle button — only for authenticated users on root comments */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setReplyingTo(replyingTo === comentario.id ? null : comentario.id)}
              className="mt-2 text-xs text-text-muted hover:text-primary transition-colors"
            >
              {replyingTo === comentario.id ? 'Cancelar' : 'Responder'}
            </button>
          )}

          {/* Inline reply form */}
          {replyingTo === comentario.id && (
            <div className="mt-3 pl-6 border-l border-border">
              <ComentarioForm
                publicacionId={publicacionId}
                respondaA={comentario.id}
                onSuccess={() => {
                  setReplyingTo(null)
                  router.refresh()
                }}
              />
            </div>
          )}

          {/* Nested replies (depth 2 — no recursion, no Responder button) */}
          {comentario.respuestas.length > 0 && (
            <ul className="ml-6 mt-3 flex flex-col gap-3 list-none p-0 border-l border-border pl-4">
              {comentario.respuestas.map((respuesta) => (
                <li key={respuesta.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <ComentarioAutor usuario={respuesta.usuario} />
                    <time dateTime={respuesta.creado_en} className="text-xs text-text-muted">
                      {formatDate(respuesta.creado_en)}
                    </time>
                  </div>
                  <p className="text-sm text-text leading-relaxed">
                    {respuesta.contenido}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
