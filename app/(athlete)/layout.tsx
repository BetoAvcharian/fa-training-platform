import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/components/ui/sign-out-button'

// 5 ítems de la Fase 7. Diseñado mobile-first a propósito (Fase 9,
// "rol-first": el atleta vive en el celular, uso diario, gesto rápido —
// a diferencia del Calendario del entrenador, que se piensa desde
// desktop).
const NAV_ITEMS = [
  { href: '/hoy', label: 'Hoy', ready: true },
  { href: '/mi-calendario', label: 'Calendario', ready: false },
  { href: '/mi-rendimiento', label: 'Rendimiento', ready: true },
  { href: '/mi-salud', label: 'Salud', ready: true },
  { href: '/perfil', label: 'Perfil', ready: false },
]

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const membership = await getMyActiveMembership()
  if (!membership || membership.role !== 'athlete') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-cream pb-20">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <p className="font-display font-bold text-navy">ENTRENAME</p>
        <SignOutButton />
      </header>

      <main className="max-w-md mx-auto px-5 pt-2 pb-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
        {NAV_ITEMS.map((item) =>
          item.ready ? (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-navy">
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ) : (
            <span key={item.href} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-status-neutral">
              <span className="text-xs">{item.label}</span>
            </span>
          )
        )}
      </nav>
    </div>
  )
}
