import AdminNav from '@/components/admin/AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      <main className="flex-1 mx-auto w-full max-w-6xl px-[--space-page] py-8">
        {children}
      </main>
    </>
  )
}
