'use client'

import dynamic from 'next/dynamic'

export const PerformanceChart = dynamic(() => import('./performance-chart').then((m) => m.PerformanceChart), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse bg-outline/30 rounded-lg" />,
})
