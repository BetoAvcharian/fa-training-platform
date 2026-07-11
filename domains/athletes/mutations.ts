import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from './rules'
import { logAudit } from '@/domains/audit/mutations'
import type {
  InviteMemberInput,
  ReassignAthleteCoachInput,
  DeactivateMemberInput,
} from './types'

export async function inviteMember(input: InviteMemberInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager'], supabase)

  if (input.role === 'athlete' && !input.coachMembershipId) {
    throw new DomainError('VALIDATION', 'Un atleta necesita un coach asignado', 'coachMembershipId')
  }

  const { data, error } = await supabase
    .from('memberships')
    .insert({
      organization_id: input.organizationId,
      invited_email: input.email.toLowerCase(),
      role: input.role,
      status: 'invitado',
      coach_membership_id: input.coachMembershipId ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear la invitación')
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'membership.invite',
    entityType: 'membership',
    entityId: data.id,
    metadata: { email: input.email, role: input.role },
  })

  return data
}

export async function reassignAthleteCoach(
  input: ReassignAthleteCoachInput,
  client?: AppSupabaseClient
) {
  const supabase = client ?? (await createServerClient())

  const { data: athlete, error: fetchError } = await supabase
    .from('memberships')
    .select('organization_id, role, coach_membership_id')
    .eq('id', input.athleteMembershipId)
    .single()

  if (fetchError || !athlete) {
    throw new DomainError('NOT_FOUND', 'Atleta no encontrado')
  }
  if (athlete.role !== 'athlete') {
    throw new DomainError('VALIDATION', 'El destino no es un atleta válido')
  }

  const actor = await requireRole(athlete.organization_id, ['manager'], supabase)
  const previousCoachId = athlete.coach_membership_id

  const { error: updateError } = await supabase
    .from('memberships')
    .update({ coach_membership_id: input.newCoachMembershipId })
    .eq('id', input.athleteMembershipId)

  if (updateError) {
    // Puede fallar acá por el trigger validate_coach_same_org (integridad
    // a nivel de base) — el mensaje de Postgres ya es descriptivo.
    throw new DomainError('CONFLICT', updateError.message)
  }

  await logAudit({
    organizationId: athlete.organization_id,
    actorMembershipId: actor.id,
    action: 'membership.reassign_coach',
    entityType: 'membership',
    entityId: input.athleteMembershipId,
    beforeState: { coach_membership_id: previousCoachId },
    afterState: { coach_membership_id: input.newCoachMembershipId },
  })
}

export async function deactivateMember(input: DeactivateMemberInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager'], supabase)

  const { error } = await supabase
    .from('memberships')
    .update({ status: 'inactivo' })
    .eq('id', input.membershipId)

  if (error) {
    throw new DomainError('CONFLICT', error.message)
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'membership.deactivate',
    entityType: 'membership',
    entityId: input.membershipId,
  })
}
