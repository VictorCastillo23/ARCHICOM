import type { Metadata } from 'next'
import { Geist_Mono, DM_Serif_Display, DM_Sans } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const dmSerif = DM_Serif_Display({
  variable: '--font-dm-serif',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Es Vitrina',
    template: '%s | Es Vitrina',
  },
  description: 'Portafolio académico',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
<<<<<<< HEAD
      <body className="min-h-full flex flex-col bg-surface-muted text-text">
=======
      <body className="min-h-full flex flex-col bg-(--color-surface-muted) text-(--color-text)">
>>>>>>> f36817eba9169096002c2a834788a6e7b1bab164
        {children}
        <Analytics/>
        <SpeedInsights />
      </body>
    </html>
  )
}
