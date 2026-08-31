'use client'

import dynamic from 'next/dynamic'

export const MyPerformanceChart = dynamic(() => import('./performance-chart').then((m) => m.MyPerformanceChart), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-outline/30 rounded-lg" />,
})
