import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getUnreadCount } from '@/domains/notifications/queries'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

// 5 ítems de la Fase 7. Diseñado mobile-first a propósito (Fase 9,
// "rol-first": el atleta vive en el celular, uso diario, gesto rápido —
// a diferencia del Calendario del entrenador, que se piensa desde
// desktop). Notificaciones no suma un 7mo ítem al nav inferior — va
// como campanita en el header, para no saturar la barra táctil.
const NAV_ITEMS = [
  { href: '/hoy', label: 'Hoy', ready: true },
  { href: '/mi-calendario', label: 'Calendario', ready: true },
  { href: '/mi-rendimiento', label: 'Rendimiento', ready: true },
  { href: '/mi-salud', label: 'Salud', ready: true },
  { href: '/mis-videos', label: 'Videos', ready: true },
  { href: '/perfil', label: 'Perfil', ready: true },
]

async function signOutAction() {
  'use server'
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const membership = await getMyActiveMembership()
  if (!membership || membership.role !== 'athlete') {
    redirect('/login')
  }
  const unreadCount = await getUnreadCount()

  return (
    <div className="min-h-screen bg-cream pb-20">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <p className="font-display font-bold text-navy">ENTRENAME</p>
        <div className="flex items-center gap-3">
          <Link href="/mis-notificaciones" className="relative text-navy">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-navy text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-xs text-status-neutral">
              Cerrar sesión
            </button>
          </form>
        </div>
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
