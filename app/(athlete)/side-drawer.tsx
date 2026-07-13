'use client'

import Link from 'next/link'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: string
  ready: boolean
}

export function SideDrawer({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-navy"
        aria-label="Abrir menú"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-cream shadow-xl p-5 flex flex-col animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center justify-between mb-6">
              <p className="font-display font-bold text-navy text-lg">ENTRENAME</p>
              <button onClick={() => setOpen(false)} className="text-navy text-xl leading-none">
                ×
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((item) =>
                item.ready ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-navy hover:bg-white transition-colors"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ) : (
                  <span key={item.href} className="flex items-center gap-3 px-3 py-3 rounded-xl text-status-neutral">
                    <span className="text-lg opacity-50">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </span>
                )
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
