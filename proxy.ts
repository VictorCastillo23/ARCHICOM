import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value)
            )
          }
        },
      },
    }
  )

  // MUST call getUser() (not getSession()) to refresh the token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect /perfil, /publicar, /notificaciones and the publication edit route
  // — redirect to /login without session. The public detail page
  // (/publicacion/[id]) stays open.
  const isEditarPublicacion =
    pathname.startsWith('/publicacion/') && pathname.endsWith('/editar')
  if (
    !user &&
    (pathname.startsWith('/perfil') ||
      pathname.startsWith('/publicar') ||
      pathname.startsWith('/mensajes') ||
      pathname.startsWith('/notificaciones') ||
      isEditarPublicacion)
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect /admin/* — redirect based on session and rol
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: perfil } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id', user.id)
      .single()
    if (perfil?.rol !== 'administrador') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
