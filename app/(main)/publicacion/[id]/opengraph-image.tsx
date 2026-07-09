import { ImageResponse } from 'next/og'
import { getPublicacion } from '@/lib/data/publicaciones'
import { TIPO_META } from '@/lib/constants/publicaciones'
import type { BadgeTone } from '@/components/ui/Badge'

export const alt = 'Vista previa de la publicación en Vitrina'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Satori (next/og) ignores Tailwind classes and CSS variables — literal hex
// values mirrored from the `@theme` tokens in app/globals.css.
const TONE_HEX: Record<BadgeTone, { fg: string; bg: string }> = {
  info: { fg: '#1d6fa4', bg: '#e8f3fa' },
  success: { fg: '#1a6b3a', bg: '#e6f4ec' },
  warning: { fg: '#92610a', bg: '#fdf3df' },
  danger: { fg: '#c0392b', bg: '#fdecea' },
  accent: { fg: '#6b4d9a', bg: '#f0ebfa' },
  neutral: { fg: '#5a5652', bg: '#f0ede9' },
}

const TEXT = '#1c1917'
const TEXT_MUTED = '#6b6560'
const BRAND = '#1a6b5e'

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

function Fallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: BRAND,
        color: '#ffffff',
        padding: 80,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', fontSize: 96, fontWeight: 700 }}>Vitrina</div>
      <div style={{ display: 'flex', fontSize: 34, marginTop: 12 }}>Portafolio académico</div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await getPublicacion(id)

  // Defense-in-depth: RLS already hides blocked/non-public rows anonymously,
  // but the guard prevents any titulo/author/resumen leak if that changes.
  if (!data || data.bloqueada) {
    return new ImageResponse(<Fallback />, { ...size })
  }

  const meta = TIPO_META[data.tipo]
  const tone = TONE_HEX[meta.tone]
  const autor = data.obra_autor_externo ?? data.usuario?.nombre ?? 'Autor desconocido'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          padding: '64px 72px',
          justifyContent: 'space-between',
          borderTop: `16px solid ${tone.fg}`,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: tone.bg,
              color: tone.fg,
              fontSize: 28,
              fontWeight: 600,
              padding: '8px 22px',
              borderRadius: 9999,
            }}
          >
            {meta.label}
          </div>
          <div style={{ display: 'flex', color: BRAND, fontSize: 34, fontWeight: 700 }}>Vitrina</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
            {clip(data.titulo, 80)}
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: TEXT_MUTED, lineHeight: 1.35, marginTop: 24 }}>
            {clip(data.resumen, 160)}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 28, color: TEXT_MUTED }}>Por {autor}</div>
      </div>
    ),
    { ...size }
  )
}
