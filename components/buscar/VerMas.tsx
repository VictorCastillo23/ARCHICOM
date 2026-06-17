'use client'

import { useState } from 'react'
import { apiClient, ApiError } from '@/lib/api/client'
import Button from '@/components/ui/Button'
import PublicacionCard from '@/components/feed/PublicacionCard'
import UsuarioCard from '@/components/usuario/UsuarioCard'
import type { PublicacionCardData, UsuarioCardData } from '@/lib/types/database'

// ---------- Types ----------

export type VerMasTipo = 'publicacion' | 'usuario'

interface VerMasBase {
  tipo: VerMasTipo
  q: string
  initialOffset: number
  initialHasMore: boolean
  children: React.ReactNode
}

interface VerMasPublicacion extends VerMasBase {
  tipo: 'publicacion'
  initialItems: PublicacionCardData[]
}

interface VerMasUsuario extends VerMasBase {
  tipo: 'usuario'
  initialItems: UsuarioCardData[]
}

export type VerMasProps = VerMasPublicacion | VerMasUsuario

type PaginatedResponse<T> = { items: T[]; hasMore: boolean }

// ---------- Component ----------

export default function VerMas(props: VerMasProps) {
  const { tipo, q, initialOffset, initialHasMore, children } = props

  // State typed per-tipo
  const [extraItems, setExtraItems] = useState<PublicacionCardData[] | UsuarioCardData[]>([])
  const [offset, setOffset] = useState(initialOffset)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadMore() {
    setLoading(true)
    setError(null)
    try {
      if (tipo === 'publicacion') {
        const res = await apiClient<PaginatedResponse<PublicacionCardData>>(
          `/api/buscar?tipo=publicacion&q=${encodeURIComponent(q)}&offset=${offset}`,
        )
        setExtraItems((prev) => [
          ...(prev as PublicacionCardData[]),
          ...res.items,
        ] as PublicacionCardData[])
        setOffset((prev) => prev + res.items.length)
        setHasMore(res.hasMore)
      } else {
        const res = await apiClient<PaginatedResponse<UsuarioCardData>>(
          `/api/buscar?tipo=usuario&q=${encodeURIComponent(q)}&offset=${offset}`,
        )
        setExtraItems((prev) => [
          ...(prev as UsuarioCardData[]),
          ...res.items,
        ] as UsuarioCardData[])
        setOffset((prev) => prev + res.items.length)
        setHasMore(res.hasMore)
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Error al cargar más resultados.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* SSR-rendered initial items */}
      {children}

      {/* Client-fetched extra items */}
      {extraItems.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 mt-6">
          {tipo === 'publicacion'
            ? (extraItems as PublicacionCardData[]).map((pub) => (
                <li key={pub.id}>
                  <PublicacionCard pub={pub} />
                </li>
              ))
            : (extraItems as UsuarioCardData[]).map((u) => (
                <li key={u.id}>
                  <UsuarioCard usuario={u} />
                </li>
              ))}
        </ul>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm text-[--color-danger] text-center">{error}</p>
      )}

      {/* Ver más button */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" size="md" loading={loading} onClick={loadMore}>
            {loading ? 'Cargando…' : 'Ver más'}
          </Button>
        </div>
      )}
    </div>
  )
}
