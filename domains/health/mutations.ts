import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'
import type { CreateHealthEpisodeInput } from './types'

/**
 * Solo la propia atleta carga sus episodios de salud (spec 2.8: "la
 * persona dueña administra"). Ni el entrenador ni el manager pueden
 * cargar en su nombre — si en el futuro hace falta que un entrenador
 * registre una lesión observada, es una decisión de producto nueva y
 * explícita, no una que se cuele por acá.
 */
export async function createHealthEpisode(
  input: CreateHealthEpisodeInput,
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')
  if (membership.id !== input.athleteMembershipId) {
    throw new DomainError('PERMISSION', 'Solo podés cargar tus propios episodios de salud')
  }

  const { data, error } = await supabase
    .from('health_episodes')
    .insert({
      organization_id: input.organizationId,
      athlete_membership_id: input.athleteMembershipId,
      type: input.type,
      title: input.title,
      severity: input.severity ?? null,
      start_date: input.startDate ?? new Date().toISOString().slice(0, 10),
      notes: input.notes ?? null,
      created_by_membership_id: membership.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new DomainError('CONFLICT', error?.message ?? 'No se pudo cargar el episodio')
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: membership.id,
    action: 'health_episode.create',
    entityType: 'health_episode',
    entityId: data.id,
    metadata: { type: input.type },
  })

  return { id: data.id }
}

export async function resolveHealthEpisode(
  id: string,
  organizationId: string,
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const { error } = await supabase
    .from('health_episodes')
    .update({ status: 'resuelto', end_date: new Date().toISOString().slice(0, 10) })
    .eq('id', id)

  if (error) {
    throw new DomainError('CONFLICT', error.message)
  }

  await logAudit({
    organizationId,
    actorMembershipId: membership.id,
    action: 'health_episode.resolve',
    entityType: 'health_episode',
    entityId: id,
  })
}
