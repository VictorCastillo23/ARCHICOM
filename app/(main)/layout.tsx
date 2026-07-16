import { Suspense } from 'react'
import Nav from '@/components/layout/Nav.server'
import NavFallback from '@/components/layout/NavFallback'
import Footer from '@/components/layout/Footer'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Suspense fallback={<NavFallback />}>
        <Nav />
      </Suspense>
      <main className="flex-1 mx-auto w-full max-w-6xl px-(--space-page) py-8">
        {children}
      </main>
      <Footer />
    </>
  )
}
