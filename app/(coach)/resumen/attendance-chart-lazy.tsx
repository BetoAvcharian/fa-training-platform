'use client'

import dynamic from 'next/dynamic'

/** Carga recharts solo en el navegador, después del render inicial — evita
    bundlear la librería entera en el JS que se manda antes de pintar la
    pantalla. Sin esto, next/dynamic en una Server Component no baja nada
    el peso real (probado: sin ssr:false el numero no se mueve). */
export const AttendanceChart = dynamic(() => import('./attendance-chart').then((m) => m.AttendanceChart), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse bg-outline/30 rounded-lg" />,
})
