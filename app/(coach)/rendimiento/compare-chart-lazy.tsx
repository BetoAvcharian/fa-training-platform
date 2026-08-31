'use client'

import dynamic from 'next/dynamic'

export const CompareChart = dynamic(() => import('./compare-chart').then((m) => m.CompareChart), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-outline/30 rounded-lg" />,
})
export const DualCompareChart = dynamic(() => import('./compare-chart').then((m) => m.DualCompareChart), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-outline/30 rounded-lg" />,
})
