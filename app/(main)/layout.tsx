import Nav from '@/components/layout/Nav.server'
import Footer from '@/components/layout/Footer'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-6xl px-(--space-page) py-8">
        {children}
      </main>
      <Footer />
    </>
  )
}
