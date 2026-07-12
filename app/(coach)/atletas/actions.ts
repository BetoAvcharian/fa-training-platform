'use server'

import { revalidatePath } from 'next/cache'
import { inviteMember, reassignAthleteCoach, deactivateMember } from '@/domains/athletes/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function inviteMemberAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const email = String(formData.get('email') ?? '').trim()
  const role = String(formData.get('role') ?? '')
  const coachMembershipId = String(formData.get('coachMembershipId') ?? '') || undefined

  if (!email) return { error: 'Falta el email' }
  if (!['coach', 'athlete'].includes(role)) return { error: 'Rol inválido' }

  try {
    await inviteMember({
      organizationId: membership.organizationId,
      email,
      role: role as 'coach' | 'athlete',
      coachMembershipId,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo invitar' }
  }

  revalidatePath('/atletas')
  return { error: null }
}

export async function reassignCoachAction(formData: FormData) {
  const athleteMembershipId = String(formData.get('athleteMembershipId') ?? '')
  const newCoachMembershipId = String(formData.get('newCoachMembershipId') ?? '')

  if (!athleteMembershipId || !newCoachMembershipId) return

  try {
    await reassignAthleteCoach({ athleteMembershipId, newCoachMembershipId })
  } catch {
    // silencioso: el mensaje del trigger de integridad ya se ve en logs;
    // para una v1 alcanza con no romper la pantalla
  }

  revalidatePath('/atletas')
}

export async function deactivateMemberAction(membershipId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  await deactivateMember({ membershipId, organizationId: membership.organizationId })
  revalidatePath('/atletas')
}
