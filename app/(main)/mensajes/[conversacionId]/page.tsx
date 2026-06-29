import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMensajes } from '@/lib/data/mensajes'
import { getPerfil } from '@/lib/data/perfil'
import HiloMensajes from '@/components/mensajes/HiloMensajes'
import type { Metadata } from 'next'

interface ConversacionPageProps {
  params: Promise<{ conversacionId: string }>
}

export const metadata: Metadata = { title: 'Conversación — Vitrina' }

export default async function ConversacionPage({ params }: ConversacionPageProps) {
  const { conversacionId } = await params

  // Defensive guard — proxy already handles unauthenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load conversation + initial messages in parallel
  const [{ data: conv }, { data: initialMensajes }] = await Promise.all([
    supabase
      .from('conversacion')
      .select('id, usuario_a, usuario_b')
      .eq('id', conversacionId)
      .maybeSingle(),
    getMensajes(conversacionId, { limit: 50 }),
  ])

  // Conversation doesn't exist or viewer is not a participant → 404
  if (
    !conv ||
    (conv.usuario_a !== user.id && conv.usuario_b !== user.id)
  ) {
    notFound()
  }

  const otroId =
    conv.usuario_a === user.id ? conv.usuario_b : conv.usuario_a

  // Fetch the other participant's profile for the thread header
  const { data: otroPerfil } = await getPerfil(otroId)
  const otroNombre = otroPerfil?.nombre ?? 'Usuario'

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 z-10 bg-surface-muted">
      <div className="animate-page mx-auto flex h-full max-w-6xl flex-col px-(--space-page) py-4">
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
          {otroNombre.charAt(0).toUpperCase()}
        </div>

        <Link
          href={`/usuario/${otroId}`}
          className="text-sm font-medium text-text hover:text-primary transition-colors truncate"
        >
          {otroNombre}
        </Link>
      </header>

        <HiloMensajes
          conversacionId={conversacionId}
          viewerId={user.id}
          otroId={otroId}
          initialMensajes={initialMensajes ?? []}
        />
      </div>
    </div>
  )
}
