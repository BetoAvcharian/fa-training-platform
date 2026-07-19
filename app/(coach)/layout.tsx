import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getUnreadCount } from '@/domains/notifications/queries'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/components/ui/sign-out-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/logo'
import { SideDrawer } from '@/app/(athlete)/side-drawer'

// Los ítems de navegación. Desktop: sidebar fijo con todo. Mobile:
// drawer lateral (☰) con todo + 4 accesos rápidos fijos abajo — antes
// era una barra de 13 píldoras scrolleable en el celular, imposible
// de usar bien.
const NAV_ITEMS = [
  { href: '/resumen', label: 'Resumen', icon: '🏠', ready: true },
  { href: '/atletas', label: 'Atletas', icon: '🏃', ready: true },
  { href: '/calendario', label: 'Calendario', icon: '📅', ready: true },
  { href: '/rendimiento', label: 'Rendimiento', icon: '📈', ready: true },
  { href: '/salud', label: 'Salud', icon: '❤️', ready: true },
  { href: '/planificacion', label: 'Planificación', icon: '📋', ready: true },
  { href: '/registros', label: 'Registros', icon: '⏱️', ready: true },
  { href: '/competencias', label: 'Competencias', icon: '🏁', ready: true },
  { href: '/evaluaciones', label: 'Evaluaciones', icon: '📝', ready: true },
  { href: '/reportes', label: 'Reportes', icon: '📊', ready: true },
  { href: '/videos', label: 'Videos', icon: '🎥', ready: true },
  { href: '/notificaciones', label: 'Notificaciones', icon: '🔔', ready: true },
  { href: '/configuracion', label: 'Configuración', icon: '⚙️', ready: true },
]

const QUICK_ITEMS = NAV_ITEMS.filter((i) => ['/resumen', '/calendario', '/atletas', '/rendimiento'].includes(i.href))

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const membership = await getMyActiveMembership()
  if (!membership || membership.role === 'athlete') {
    redirect('/login')
  }
  const unreadCount = await getUnreadCount()

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile: header simple + drawer + accesos rápidos fijos abajo. */}
      <header className="md:hidden sticky top-0 z-10 bg-navy text-white">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" />
            <div>
              <p className="font-display font-bold text-lg leading-none tracking-wide">ENTRENAME</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wide mt-1">
                {membership.role === 'manager' ? 'Panel Manager' : 'Panel Entrenador'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-lg leading-none text-white" />
            <Link href="/notificaciones" className="relative text-white">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold text-navy text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
            <SideDrawer items={NAV_ITEMS} />
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-gold via-gold/40 to-transparent" />
      </header>

      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-10 bg-navy rounded-full px-2 py-2 flex items-center gap-1 shadow-lg">
        {QUICK_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center w-16 h-12 rounded-full text-white/90 hover:bg-panel/10 transition-colors"
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[9px] mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Desktop: sidebar fijo. */}
      <aside className="hidden md:flex w-56 shrink-0 bg-navy text-white flex-col p-4 min-h-screen sticky top-0">
        <div className="mb-8 px-1 pt-1 flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <div>
            <p className="font-display font-bold text-lg tracking-wide">ENTRENAME</p>
            <p className="text-[11px] text-white/50 uppercase tracking-wide mt-0.5">
              {membership.role === 'manager' ? 'Panel Manager' : 'Panel Entrenador'}
            </p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm rounded-lg px-3 py-2.5 text-white/70 hover:bg-panel/10 hover:text-white transition-colors flex items-center justify-between"
              >
                {item.label}
                {item.href === '/notificaciones' && unreadCount > 0 && (
                  <span className="bg-gold text-navy rounded-full px-1.5 text-[10px] font-bold">{unreadCount}</span>
                )}
              </Link>
            ) : (
              <span
                key={item.href}
                className="text-sm rounded-lg px-3 py-2.5 text-white/30 cursor-default flex items-center justify-between"
                title="Todavía no construido"
              >
                {item.label}
                <span className="text-[10px]">pronto</span>
              </span>
            )
          )}
        </nav>
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs text-white/50">Tema</span>
          <ThemeToggle className="text-lg leading-none text-white" />
        </div>
        <SignOutButton />
      </aside>
      <main className="flex-1 p-4 pb-28 md:pb-8 md:p-8 max-w-6xl overflow-x-hidden">{children}</main>
    </div>
  )
}
