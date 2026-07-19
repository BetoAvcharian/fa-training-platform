/** El mismo puntaje World Athletics, en todos lados donde se muestra una marca. */
export function WaPointsBadge({ points }: { points: number | null | undefined }) {
  if (!points) return null
  return (
    <span className="text-[10px] font-bold bg-gold/15 text-gold px-1.5 py-0.5 rounded-full whitespace-nowrap" title="Puntos World Athletics">
      {points} pts
    </span>
  )
}
