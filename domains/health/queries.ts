import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import type { HealthEpisode } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): HealthEpisode {
  return {
    id: row.id,
    organizationId: row.organization_id,
    athleteMembershipId: row.athlete_membership_id,
    type: row.type,
    title: row.title,
    severity: row.severity,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

/**
 * Episodios de salud del atleta autenticado. RLS ya restringe esta tabla
 * a "dueño administra, entrenador directo lee, nadie más" (spec 2.8) —
 * acá solo pedimos la sesión activa, la fila la filtra la base.
 */
export async function getMyHealthEpisodes(client?: AppSupabaseClient): Promise<HealthEpisode[]> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const { data, error } = await supabase
    .from('health_episodes')
    .select('*')
    .eq('athlete_membership_id', membership.id)
    .order('start_date', { ascending: false })

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map(mapRow)
}

/**
 * Vista del entrenador directo sobre los episodios de un atleta puntual.
 * No hay chequeo de rol acá a propósito: si el que pregunta no es el
 * entrenador directo de ese atleta (ni el propio atleta), la policy de
 * RLS devuelve cero filas — es la única puerta, no hay bypass posible
 * desde este dominio (spec 2.8: "nadie más accede").
 */
export async function getAthleteHealthEpisodes(
  athleteMembershipId: string,
  client?: AppSupabaseClient
): Promise<HealthEpisode[]> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from('health_episodes')
    .select('*')
    .eq('athlete_membership_id', athleteMembershipId)
    .order('start_date', { ascending: false })

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map(mapRow)
}
