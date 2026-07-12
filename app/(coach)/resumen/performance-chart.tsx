'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Point {
  date: string
  assigned: number
  completed: number
}

function formatShort(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })
}

export function PerformanceChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    date: formatShort(d.date),
    '% completado': d.assigned > 0 ? Math.round((d.completed / d.assigned) * 100) : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="date" fontSize={11} stroke="#94A3B8" />
        <YAxis fontSize={11} stroke="#94A3B8" domain={[0, 100]} />
        <Tooltip />
        <Line type="monotone" dataKey="% completado" stroke="#C6A55C" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
