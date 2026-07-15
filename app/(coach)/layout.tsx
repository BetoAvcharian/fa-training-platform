import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getUnreadCount } from '@/domains/notifications/queries'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/components/ui/sign-out-button'
import { Logo } from '@/components/logo'

// Los 8 ítems de la Fase 7 — bajado de los 15 de la V1. Las pantallas
// que todavía no se construyeron (Atletas, Salud, Planificación,
// Biblioteca, Configuración) quedan igual en el menú, marcadas
// "próximamente" — más honesto que esconder la navegación planeada.
const NAV_ITEMS = [
  { href: '/resumen', label: 'Resumen', ready: true },
  { href: '/atletas', label: 'Atletas', ready: true },
  { href: '/calendario', label: 'Calendario', ready: true },
  { href: '/rendimiento', label: 'Rendimiento', ready: true },
  { href: '/salud', label: 'Salud', ready: true },
  { href: '/planificacion', label: 'Planificación', ready: true },
  { href: '/registros', label: 'Registros', ready: true },
  { href: '/competencias', label: 'Competencias', ready: true },
  { href: '/evaluaciones', label: 'Evaluaciones', ready: true },
  { href: '/reportes', label: 'Reportes', ready: true },
  { href: '/videos', label: 'Videos', ready: true },
  { href: '/notificaciones', label: 'Notificaciones', ready: true },
  { href: '/configuracion', label: 'Configuración', ready: true },
]

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const membership = await getMyActiveMembership()
  if (!membership || membership.role === 'athlete') {
    redirect('/login')
  }
  const unreadCount = await getUnreadCount()

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile: barra superior + nav horizontal scrolleable. Desktop: oculto, usa el sidebar de abajo. */}
      <header className="md:hidden sticky top-0 z-10 bg-navy text-white">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" />
            <div>
              <p className="font-display font-bold text-lg leading-none tracking-wide">ENTRENAME</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wide mt-1">
                {membership.role === 'manager' ? 'Panel Manager' : 'Panel Entrenador'}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 -mb-px">
          {NAV_ITEMS.filter((i) => i.ready).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 text-xs rounded-full px-3 py-1.5 bg-white/10 text-white/80 whitespace-nowrap flex items-center gap-1"
            >
              {item.label}
              {item.href === '/notificaciones' && unreadCount > 0 && (
                <span className="bg-gold text-navy rounded-full px-1.5 text-[10px] font-bold">{unreadCount}</span>
              )}
            </Link>
          ))}
        </nav>
      </header>

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
                className="text-sm rounded-lg px-3 py-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between"
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
        <SignOutButton />
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl overflow-x-hidden">{children}</main>
    </div>
  )
}
