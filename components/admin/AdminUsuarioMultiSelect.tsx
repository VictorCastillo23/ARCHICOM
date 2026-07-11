'use client'

// Forked from components/buscar/SearchBox.tsx's debounce/abort/combobox
// skeleton — instead of navigating on select, accumulates chosen usuarios as
// chips for the "usuarios específicos" destinatarios_criterio.
import { useEffect, useId, useRef, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import Avatar from '@/components/ui/Avatar'
import type { UsuarioCardData } from '@/lib/types/database'

type AutocompleteResponse = {
  publicaciones: unknown[]
  usuarios: UsuarioCardData[]
}

export interface AdminUsuarioMultiSelectProps {
  selected: UsuarioCardData[]
  onChange: (next: UsuarioCardData[]) => void
}

export default function AdminUsuarioMultiSelect({
  selected,
  onChange,
}: AdminUsuarioMultiSelectProps) {
  const uid = useId()
  const listId = `${uid}-listbox`

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'results' | 'error'>('idle')
  const [suggestions, setSuggestions] = useState<UsuarioCardData[]>([])
  const [open, setOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocumentClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    abortRef.current?.abort()

    if (trimmed.length < 2) {
      const reset = setTimeout(() => {
        setSuggestions([])
        setStatus('idle')
        setOpen(false)
      }, 0)
      return () => clearTimeout(reset)
    }

    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      setStatus('loading')
      setOpen(true)

      try {
        const data = await apiClient<AutocompleteResponse>(
          `/api/buscar?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return

        const selectedIds = new Set(selected.map((u) => u.id))
        setSuggestions(data.usuarios.filter((u) => !selectedIds.has(u.id)))
        setStatus('results')
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setStatus('error')
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `selected` intentionally excluded: re-filtering on every add would abort/refire the in-flight search
  }, [query])

  function addUsuario(usuario: UsuarioCardData) {
    onChange([...selected, usuario])
    setSuggestions((prev) => prev.filter((u) => u.id !== usuario.id))
    setQuery('')
    setOpen(false)
  }

  function removeUsuario(id: string) {
    onChange(selected.filter((u) => u.id !== id))
  }

  const isExpanded = open && query.trim().length >= 2

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
          {selected.map((u) => (
            <li
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted pl-1 pr-2 py-1 text-sm"
            >
              <Avatar nombre={u.nombre} size="sm" />
              <span className="truncate max-w-40">{u.nombre}</span>
              <button
                type="button"
                onClick={() => removeUsuario(u.id)}
                aria-label={`Quitar a ${u.nombre}`}
                className="text-text-muted hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={containerRef} className="relative">
        <input
          type="search"
          role="combobox"
          aria-label="Buscar usuarios por nombre"
          aria-expanded={isExpanded}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Buscar por nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
        />

        {isExpanded && (
          <div
            id={listId}
            role="listbox"
            aria-label="Resultados de usuarios"
            className="absolute left-0 top-full mt-1 z-50 w-full rounded-lg border border-border bg-surface shadow-lg overflow-hidden"
          >
            {status === 'loading' && (
              <div className="p-3 text-sm text-text-muted" aria-live="polite" aria-busy="true">
                Buscando…
              </div>
            )}

            {status === 'error' && (
              <div className="p-3 text-sm text-danger" role="alert">
                Error al buscar. Intenta de nuevo.
              </div>
            )}

            {status === 'results' && suggestions.length === 0 && (
              <div className="p-3 text-sm text-text-muted" aria-live="polite">
                No se encontraron usuarios.
              </div>
            )}

            {status === 'results' && suggestions.length > 0 && (
              <ul className="py-1 list-none m-0">
                {suggestions.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addUsuario(u)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
                    >
                      <Avatar nombre={u.nombre} size="sm" />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-medium">{u.nombre}</span>
                        {(u.institucion ?? u.carrera) && (
                          <span className="block text-xs text-text-muted truncate">
                            {u.institucion ?? u.carrera}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
