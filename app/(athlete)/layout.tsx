import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getUnreadCount } from '@/domains/notifications/queries'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Logo } from '@/components/logo'
import { SideDrawer } from './side-drawer'

// Rediseño (feedback del usuario: la barra de 6 ítems abajo se veía
// "rara" en el celular). Ahora: 3 accesos rápidos fijos abajo (los de
// uso diario) + un menú lateral desplegable (☰ en el header) con todo
// lo demás, incluidos esos mismos 3 por si acá.
const NAV_ITEMS = [
  { href: '/hoy', label: 'Hoy', icon: '🏠', ready: true },
  { href: '/mi-calendario', label: 'Calendario', icon: '📅', ready: true },
  { href: '/mi-rendimiento', label: 'Rendimiento', icon: '📈', ready: true },
  { href: '/mis-registros', label: 'Registrar marca', icon: '⏱️', ready: true },
  { href: '/mis-competencias', label: 'Competencias', icon: '🏁', ready: true },
  { href: '/mis-objetivos', label: 'Mis objetivos', icon: '🎯', ready: true },
  { href: '/mi-salud', label: 'Salud', icon: '❤️', ready: true },
  { href: '/mis-videos', label: 'Videos', icon: '🎥', ready: true },
  { href: '/perfil', label: 'Perfil', icon: '👤', ready: true },
]

const QUICK_ITEMS = NAV_ITEMS.filter((i) => ['/hoy', '/mi-calendario', '/mi-salud'].includes(i.href))

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
    <div className="min-h-screen bg-cream pb-24">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="w-7 h-7" />
          <p className="font-display font-bold text-navy tracking-wide">ENTRENAME</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/mis-notificaciones" className="relative text-navy">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-navy text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
          <SideDrawer items={[...NAV_ITEMS, { href: '/mis-notificaciones', label: 'Notificaciones', icon: '🔔', ready: true }]} />
          <form action={signOutAction}>
            <button type="submit" className="text-xs text-status-neutral">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-2 pb-6">{children}</main>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-navy rounded-full px-2 py-2 flex items-center gap-1 shadow-lg">
        {QUICK_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center w-16 h-12 rounded-full text-white/90 hover:bg-white/10 transition-colors"
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[9px] mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
