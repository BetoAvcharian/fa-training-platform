'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
  ready: boolean
}

/**
 * Sidebar de escritorio con estado activo — estilo Linear/Notion:
 * ítem activo con fondo lleno + barra de acento a la izquierda, en
 * vez de solo un hover genérico. Antes ningún ítem se distinguía
 * como "dónde estoy parado".
 */
export function SidebarNav({ items, unreadCount }: { items: NavItem[]; unreadCount: number }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 flex-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        if (!item.ready) {
          return (
            <span
              key={item.href}
              className="text-sm rounded-lg px-3 py-2.5 text-white/30 cursor-default flex items-center gap-2.5"
              title="Todavía no construido"
            >
              <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <span className="text-[10px]">pronto</span>
            </span>
          )
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative text-sm rounded-lg pl-3 pr-2.5 py-2.5 flex items-center gap-2.5 transition-colors ${
              active ? 'bg-white/12 text-white font-medium' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-gold" />}
            <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.href === '/notificaciones' && unreadCount > 0 && (
              <span className="bg-gold text-navy rounded-full px-1.5 text-[10px] font-bold">{unreadCount}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
