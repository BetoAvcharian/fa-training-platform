'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Brush } from 'recharts'

interface Point {
  date: string
  [athleteName: string]: string | number
}

const COLORS = ['#2563EB', '#C6A55C', '#2E7D32', '#B45309', '#C62828', '#6D28D9']

export function CompareChart({ data, athleteNames }: { data: Point[]; athleteNames: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B833" />
        <XAxis dataKey="date" fontSize={11} stroke="#94A3B8" />
        <YAxis fontSize={11} stroke="#94A3B8" domain={['auto', 'auto']} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {athleteNames.map((name, i) => (
          <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        ))}
        <Line type="monotone" dataKey="Promedio" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        {data.length > 6 && <Brush dataKey="date" height={22} stroke="#C6A55C" travellerWidth={10} />}
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Cuando el entrenador elige exactamente 2 pruebas para comparar, las
 * mete en el mismo gráfico (no una al lado de la otra) — cada prueba
 * con su propio eje Y (izquierda/derecha) porque suelen tener
 * unidades distintas (segundos vs metros, por ejemplo). La prueba B
 * se dibuja con línea punteada para distinguirla de un vistazo.
 */
export function DualCompareChart({
  data,
  seriesA,
  seriesB,
  labelA,
  labelB,
}: {
  data: Point[]
  seriesA: string[]
  seriesB: string[]
  labelA: string
  labelB: string
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B833" />
        <XAxis dataKey="date" fontSize={11} stroke="#94A3B8" />
        <YAxis yAxisId="left" fontSize={11} stroke="#94A3B8" domain={['auto', 'auto']} label={{ value: labelA, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94A3B8' }} />
        <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#94A3B8" domain={['auto', 'auto']} label={{ value: labelB, angle: 90, position: 'insideRight', fontSize: 10, fill: '#94A3B8' }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {seriesA.map((name, i) => (
          <Line
            key={name}
            yAxisId="left"
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
        {seriesB.map((name, i) => (
          <Line
            key={name}
            yAxisId="right"
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
        {data.length > 6 && <Brush dataKey="date" height={22} stroke="#C6A55C" travellerWidth={10} />}
      </LineChart>
    </ResponsiveContainer>
  )
}
