import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSeSiguenMutuamente, getConversacionConUsuario } from '@/lib/data/mensajes'
import { getPerfil } from '@/lib/data/perfil'
import HiloMensajes from '@/components/mensajes/HiloMensajes'
import type { Metadata } from 'next'

interface NuevoMensajePageProps {
  searchParams: Promise<{ u?: string }>
}

export const metadata: Metadata = { title: 'Nuevo mensaje — Vitrina' }

export default async function NuevoMensajePage({ searchParams }: NuevoMensajePageProps) {
  const { u: otroId } = await searchParams

  // Defensive guard — proxy handles unauthenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ?u= is required — without a recipient we don't know who to message
  if (!otroId) {
    notFound()
  }

  // Can't message yourself
  if (otroId === user.id) {
    redirect('/mensajes')
  }

  // Verify mutual follow (visual gate — the RPC is the real security gate)
  const [{ data: seSiguen }, { data: otroPerfil }] = await Promise.all([
    getSeSiguenMutuamente(user.id, otroId),
    getPerfil(otroId),
  ])

  if (!seSiguen || !otroPerfil) {
    notFound()
  }

  // If a conversation already exists (e.g. they were mutual before, unfollowed,
  // then re-followed via a request), open the real thread with its history
  // instead of showing an empty "new conversation" composer.
  const { data: conversacionExistente } = await getConversacionConUsuario(user.id, otroId)
  if (conversacionExistente) {
    redirect(`/mensajes/${conversacionExistente.id}`)
  }

  return (
    <div className="animate-page flex flex-col" style={{ height: 'calc(100dvh - 4rem)' }}>
      {/* Thread header */}
      <header className="shrink-0 flex items-center gap-3 pb-3 border-b border-border mb-2">
        <Link
          href="/mensajes"
          className="shrink-0 text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors"
          aria-label="Volver a mensajes"
        >
          ← Mensajes
        </Link>

        {/* Avatar initials */}
        <div
          aria-hidden="true"
          className="shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary"
        >
          {otroPerfil.nombre.charAt(0).toUpperCase()}
        </div>

        <Link
          href={`/usuario/${otroId}`}
          className="text-sm font-medium text-text hover:text-primary transition-colors truncate"
        >
          {otroPerfil.nombre}
        </Link>

        <span className="ml-auto text-xs text-text-muted italic">Nueva conversación</span>
      </header>

      {/* HiloMensajes in "new conversation" mode — no conversacionId yet.
          On first send, the client reads mensaje.conversacion_id and router.replace
          to /mensajes/<convId>, so the Realtime channel opens naturally. */}
      <HiloMensajes
        viewerId={user.id}
        otroId={otroId}
        initialMensajes={[]}
      />
    </div>
  )
}
