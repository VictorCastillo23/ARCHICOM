import type { ReactNode } from 'react'

// Auth layout — no Nav, no Footer.
// Centers the form card vertically and horizontally.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-bg] px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
