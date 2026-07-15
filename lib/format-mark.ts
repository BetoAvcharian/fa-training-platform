/**
 * Formatea el valor de una marca para mostrar. Si la unidad es
 * segundos y el valor es >= 60, lo muestra como m:ss.cc (formato
 * estándar de atletismo) en vez de "131.4 s" — mucho más legible
 * para 800m/1500m y años de fondo en general.
 */
export function formatMark(value: number, unitSymbol: string | null): string {
  if (unitSymbol === 's' && value >= 60) {
    const minutes = Math.floor(value / 60)
    const seconds = value - minutes * 60
    const secondsStr = seconds.toFixed(2).padStart(5, '0')
    return `${minutes}:${secondsStr}`
  }

  // Incluso por debajo de 60s, formateamos consistente: 2 decimales
  // para segundos, sin decimales sobrantes para el resto (kg, m, pt).
  const formatted = unitSymbol === 's' ? value.toFixed(2) : String(value)
  return unitSymbol ? `${formatted} ${unitSymbol}` : formatted
}
