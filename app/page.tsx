import { redirect } from 'next/navigation'
import { getMyActiveMembership } from '@/domains/athletes/queries'

export default async function RootPage() {
  const membership = await getMyActiveMembership()

  if (!membership) {
    redirect('/login')
  }

  if (membership.role === 'athlete') {
    redirect('/hoy')
  }

  // manager y coach comparten el mismo Resumen (Fase 8.8: mismo
  // componente, scope resuelto por RLS) — la diferencia de qué ve cada
  // uno la resuelve la consulta, no una pantalla distinta.
  redirect('/resumen')
}
