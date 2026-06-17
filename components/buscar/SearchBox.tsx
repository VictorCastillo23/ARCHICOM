'use client'

import { useEffect, useRef, useState, useId, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import TipoBadge from '@/components/ui/TipoBadge'
import Avatar from '@/components/ui/Avatar'
import type { PublicacionCardData, UsuarioCardData } from '@/lib/types/database'

// ---------- Types ----------

type PublicacionSuggestion = {
  kind: 'publicacion'
  id: string
  titulo: string
  tipo: PublicacionCardData['tipo']
  href: string
}

type UsuarioSuggestion = {
  kind: 'usuario'
  id: string
  nombre: string
  institucion?: string
  carrera?: string
  href: string
}

type Suggestion = PublicacionSuggestion | UsuarioSuggestion

type Status = 'idle' | 'loading' | 'results' | 'error'

type AutocompleteResponse = {
  publicaciones: PublicacionCardData[]
  usuarios: UsuarioCardData[]
}

// ---------- Combine algorithm (ADR-4) ----------

function combineSuggestions(
  pubs: PublicacionCardData[],
  users: UsuarioCardData[],
  cap = 6,
): Suggestion[] {
  const out: Suggestion[] = []
  const seen = new Set<string>()

  const push = (s: Suggestion) => {
    const key = `${s.kind}:${s.id}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(s)
  }

  for (const p of pubs) {
    if (out.length >= cap) break
    push({ kind: 'publicacion', id: p.id, titulo: p.titulo, tipo: p.tipo, href: `/publicacion/${p.id}` })
  }
  for (const u of users) {
    if (out.length >= cap) break
    push({ kind: 'usuario', id: u.id, nombre: u.nombre, institucion: u.institucion, carrera: u.carrera, href: `/usuario/${u.id}` })
  }

  return out
}

// ---------- Component ----------

export default function SearchBox() {
  const router = useRouter()
  const uid = useId()
  const listId = `${uid}-listbox`
  const optionId = (i: number) => `${uid}-option-${i}`

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ---- Close on outside click ----
  useEffect(() => {
    function onDocumentClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  // ---- Debounced fetch ----
  useEffect(() => {
    const trimmed = query.trim()

    // Abort previous in-flight request unconditionally so stale fetches stop
    abortRef.current?.abort()

    if (trimmed.length < 2) {
      // Batch reset via a single timeout so no synchronous setState in effect body
      const reset = setTimeout(() => {
        setSuggestions([])
        setStatus('idle')
        setOpen(false)
        setActiveIndex(-1)
      }, 0)
      return () => clearTimeout(reset)
    }

    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      setSuggestions([])
      setStatus('loading')
      setOpen(true)
      setActiveIndex(-1)

      try {
        const data = await apiClient<AutocompleteResponse>(
          `/api/buscar?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return

        const combined = combineSuggestions(data.publicaciones, data.usuarios)
        setSuggestions(combined)
        setStatus('results')
        setOpen(true)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setStatus('error')
        setOpen(true)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // ---- Navigate and close ----
  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      setActiveIndex(-1)
      router.push(href)
    },
    [router],
  )

  // ---- Keyboard handler ----
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? prev : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        navigate(suggestions[activeIndex].href)
      } else {
        const q = query.trim()
        if (q.length >= 2) navigate(`/buscar?q=${encodeURIComponent(q)}`)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const isExpanded = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Buscar publicaciones y personas"
        aria-expanded={isExpanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        placeholder="Buscar…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        className={[
          'w-48 sm:w-56 rounded-[--radius-md] border border-[--color-surface-border]',
          'bg-[--color-surface-muted] px-3 py-1.5 text-sm text-[--color-text]',
          'placeholder:text-[--color-text-muted]',
          'focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent',
          'transition-all',
        ]
          .filter(Boolean)
          .join(' ')}
      />

      {/* Dropdown */}
      {isExpanded && (
        <div
          id={listId}
          role="listbox"
          aria-label="Sugerencias de búsqueda"
          className={[
            'absolute right-0 top-full mt-1 z-50 w-80',
            'rounded-[--radius-lg] border border-[--color-surface-border]',
            'bg-[--color-surface] shadow-lg overflow-hidden',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {/* Loading */}
          {status === 'loading' && (
            <div className="p-3 space-y-2" aria-live="polite" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-[--color-surface-muted]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-[--color-surface-muted] rounded w-3/4" />
                    <div className="h-2.5 bg-[--color-surface-muted] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="p-4 text-sm text-[--color-danger] text-center" role="alert">
              Error al buscar. Intentá de nuevo.
            </div>
          )}

          {/* Results — empty */}
          {status === 'results' && suggestions.length === 0 && (
            <div className="p-4 text-sm text-[--color-text-muted] text-center" aria-live="polite">
              No se encontraron resultados.
            </div>
          )}

          {/* Results — list */}
          {status === 'results' && suggestions.length > 0 && (
            <ul className="py-1 list-none m-0">
              {suggestions.map((s, i) => {
                const isActive = i === activeIndex
                return (
                  <li key={`${s.kind}:${s.id}`}>
                    <button
                      id={optionId(i)}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault() // prevent blur before click
                        navigate(s.href)
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={[
                        'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-[--color-surface-muted] text-[--color-text]'
                          : 'text-[--color-text] hover:bg-[--color-surface-muted]',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {s.kind === 'publicacion' ? (
                        <>
                          <TipoBadge tipo={s.tipo} />
                          <span className="flex-1 min-w-0 truncate">{s.titulo}</span>
                        </>
                      ) : (
                        <>
                          <Avatar nombre={s.nombre} size="sm" />
                          <span className="flex-1 min-w-0">
                            <span className="block truncate font-medium">{s.nombre}</span>
                            {(s.institucion ?? s.carrera) && (
                              <span className="block text-xs text-[--color-text-muted] truncate">
                                {s.institucion ?? s.carrera}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  </li>
                )
              })}

              {/* "Ver todos" link */}
              <li className="border-t border-[--color-surface-border] mt-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    navigate(`/buscar?q=${encodeURIComponent(query.trim())}`)
                  }}
                  className="w-full px-3 py-2 text-xs text-[--color-text-muted] hover:text-[--color-primary] hover:bg-[--color-surface-muted] text-left transition-colors"
                >
                  Ver todos los resultados para &ldquo;{query.trim()}&rdquo;
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
