import { ImageResponse } from 'next/og'
import { getPerfil, getPerfilStats } from '@/lib/data/perfil'

export const alt = 'Perfil en Vitrina'
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
  const { data: perfil } = await getPerfil(id)

  if (!perfil) {
    return new ImageResponse(<Fallback />, { ...size })
  }

  const stats = await getPerfilStats(id)
  const inicial = perfil.nombre.trim().charAt(0).toUpperCase() || '?'
  const subtitulo = [perfil.carrera, perfil.institucion].filter(Boolean).join(' · ')

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
        <div style={{ display: 'flex', color: BRAND, fontSize: 34, fontWeight: 700 }}>Vitrina</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 160,
              height: 160,
              borderRadius: '50%',
              backgroundColor: BRAND,
              color: '#ffffff',
              fontSize: 72,
              fontWeight: 700,
            }}
          >
            {inicial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
              {clip(perfil.nombre, 40)}
            </div>
            {subtitulo && (
              <div style={{ display: 'flex', fontSize: 30, color: TEXT_MUTED, marginTop: 12 }}>
                {clip(subtitulo, 60)}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 28, color: TEXT_MUTED }}>
          {stats.totalPublicaciones} {stats.totalPublicaciones === 1 ? 'publicación' : 'publicaciones'}
        </div>
      </div>
    ),
    { ...size }
  )
}
