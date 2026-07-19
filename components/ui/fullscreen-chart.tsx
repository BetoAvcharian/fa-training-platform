'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Envuelve un gráfico con un botón de pantalla completa, afuera del
 * contenido (no tapa nada). En celular lo gira 90° para aprovechar
 * el ancho — en PC no tiene sentido girar nada, así que ahí solo
 * agranda sin rotar.
 */
export function FullscreenChart({ title, children }: { title?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
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
      {isMobile ? (
        <div className="rotate-90 origin-center" style={{ width: '100vh', maxWidth: '100vh' }}>
          <div className="bg-panel rounded-xl p-4 mx-auto" style={{ width: '92vh' }}>
            {title && <p className="text-sm font-semibold text-ink mb-2">{title}</p>}
            {children}
          </div>
        </div>
      ) : (
        <div className="bg-panel rounded-xl p-6 max-h-[90vh] max-w-[92vw] overflow-auto">
          {title && <p className="text-base font-semibold text-ink mb-3">{title}</p>}
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-status-neutral hover:text-ink flex items-center gap-1 px-2 py-1"
        >
          ⛶ Pantalla completa
        </button>
      </div>
      {children}
      {open && mounted && createPortal(overlay, document.body)}
    </div>
  )
}
