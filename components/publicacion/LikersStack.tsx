'use client'

import { useState } from 'react'
import LikersModal from '@/components/publicacion/LikersModal'

interface LikersStackProps {
  publicacionId: string
  /** A few likers (server-fetched) to render as avatars — up to ~3. */
  preview: { id: string; nombre: string }[]
  /** Total like count (may exceed preview.length). */
  count: number
}

/** First word of a name, for compact social-proof copy. */
function firstName(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre
}

/** "A María y 4 más les gustó" — adapts to how many names we can show. */
function buildLabel(names: string[], count: number): string {
  if (count === 1) return `A ${names[0] ?? 'alguien'} le gustó`
  if (count === 2) {
    return `A ${names[0]} y ${names[1] ?? '1 persona'} les gustó`
  }
  // count >= 3 → show two names + remainder
  const others = count - 2
  return `A ${names[0]}, ${names[1]} y ${others} más les gustó`
}

export default function LikersStack({
  publicacionId,
  preview,
  count,
}: LikersStackProps) {
  const [open, setOpen] = useState(false)

  // Nothing liked yet → no social proof to show.
  if (count <= 0) return null

  const avatars = preview.slice(0, 3)
  const names = preview.map((p) => firstName(p.nombre))
  const label = buildLabel(names, count)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${label}. Ver la lista completa`}
        className="group inline-flex items-center gap-2 rounded-md py-1 pr-2 text-sm text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {avatars.length > 0 && (
          <span className="flex -space-x-2" aria-hidden="true">
            {avatars.map((liker) => (
              <span
                key={liker.id}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-muted text-[0.65rem] font-semibold uppercase text-text-muted"
              >
                {liker.nombre.charAt(0)}
              </span>
            ))}
          </span>
        )}
        <span className="group-hover:underline">{label}</span>
      </button>

      <LikersModal
        open={open}
        onClose={() => setOpen(false)}
        publicacionId={publicacionId}
      />
    </>
  )
}
