'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Point {
  date: string
  [athleteName: string]: string | number
}

const COLORS = ['#0B1E3F', '#C6A55C', '#2E7D32', '#B45309', '#C62828', '#6D28D9']

export function CompareChart({ data, athleteNames }: { data: Point[]; athleteNames: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="date" fontSize={11} stroke="#94A3B8" />
        <YAxis fontSize={11} stroke="#94A3B8" />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {athleteNames.map((name, i) => (
          <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        ))}
        <Line type="monotone" dataKey="Promedio" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
