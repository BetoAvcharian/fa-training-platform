'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Point {
  date: string
  assigned: number
  completed: number
}

function formatShort(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })
}

export function AttendanceChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    date: formatShort(d.date),
    Completado: d.completed,
    Pendiente: Math.max(d.assigned - d.completed, 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="date" fontSize={11} stroke="#94A3B8" />
        <YAxis fontSize={11} stroke="#94A3B8" allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="Completado" stackId="a" fill="#0B1E3F" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Pendiente" stackId="a" fill="#C62828" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
