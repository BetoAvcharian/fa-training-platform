'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Envuelve un gráfico con un botón de pantalla completa. En pantalla
 * completa lo gira 90° (como si rotaras el teléfono) y lo agranda,
 * para que se pueda leer con muchos puntos de datos sin tener que
 * girar el dispositivo de verdad.
 */
export function FullscreenChart({ title, children }: { title?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const overlay = (
    <div className="fixed inset-0 z-[100] bg-navy flex items-center justify-center">
      <button
        onClick={() => setOpen(false)}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center text-lg"
        aria-label="Cerrar"
      >
        ×
      </button>
      <div className="rotate-90 origin-center" style={{ width: '100vh', maxWidth: '100vh' }}>
        <div className="bg-panel rounded-xl p-4 mx-auto" style={{ width: '92vh' }}>
          {title && <p className="text-sm font-semibold text-ink mb-2">{title}</p>}
          {children}
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-0 right-0 z-10 text-xs text-status-neutral hover:text-ink flex items-center gap-1 px-2 py-1"
      >
        ⛶ Pantalla completa
      </button>
      {children}
      {open && mounted && createPortal(overlay, document.body)}
    </div>
  )
}
