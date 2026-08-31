import { redirect } from 'next/navigation'
import { getMyActiveMembership, getMyActiveMemberships } from '@/domains/athletes/queries'

export default async function RootPage() {
  const membership = await getMyActiveMembership()

  if (!membership) {
    // null puede ser "no autenticado" O "autenticado pero con más de un
    // perfil y todavía no eligió cuál" — se distingue acá antes de mandar
    // a cualquiera de los dos lados.
    const options = await getMyActiveMemberships()
    if (options.length > 1) redirect('/elegir-perfil')
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
