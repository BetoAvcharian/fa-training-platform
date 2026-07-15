/**
 * "Hoy" en horario de Argentina/Uruguay (UTC-3, sin horario de
 * verano) — nunca en UTC del servidor. Sin esto, de noche (después
 * de las ~21:00 hora local) el servidor ya piensa que es el día
 * siguiente, y "Hoy" deja de coincidir con lo que muestra el
 * Calendario para el mismo instante.
 */
export function getTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** La misma fecha "de hoy" pero como objeto Date (medianoche local). */
export function getTodayDate(): Date {
  return new Date(getTodayISO() + 'T00:00:00')
}
