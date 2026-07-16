import { ImageResponse } from 'next/og'
import { getRevista } from '@/lib/data/revistas'

export const alt = 'Revista en Vitrina'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Satori (next/og) ignores Tailwind classes and CSS variables — literal hex
// values mirrored from the `@theme` tokens in app/globals.css.
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
  const { data } = await getRevista(id)

  if (!data) {
    return new ImageResponse(<Fallback />, { ...size })
  }

  const articulos = data.revista_articulo ?? []

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
          borderTop: `16px solid ${BRAND}`,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#e6f4ec',
              color: '#1a6b3a',
              fontSize: 28,
              fontWeight: 600,
              padding: '8px 22px',
              borderRadius: 9999,
            }}
          >
            Revista{data.volumen ? ` · Vol. ${data.volumen}` : ''}
          </div>
          <div style={{ display: 'flex', color: BRAND, fontSize: 34, fontWeight: 700 }}>Vitrina</div>
        </div>

        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
          {clip(data.titulo, 80)}
        </div>

        <div style={{ display: 'flex', fontSize: 28, color: TEXT_MUTED }}>
          {articulos.length} {articulos.length === 1 ? 'artículo curado' : 'artículos curados'}
        </div>
      </div>
    ),
    { ...size }
  )
}
