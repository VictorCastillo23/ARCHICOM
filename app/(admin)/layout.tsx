import AdminNav from '@/components/admin/AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[--color-surface-muted]">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-[--space-page] py-8">
        {children}
      </main>
    </div>
  )
}
