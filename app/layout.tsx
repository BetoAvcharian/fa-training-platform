import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ENTRENAME',
  description: 'Plataforma de rendimiento para atletismo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
