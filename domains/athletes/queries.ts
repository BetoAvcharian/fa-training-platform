import { createServerClient, createServiceClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { RosterEntry, CoachDirectoryEntry, Group } from './types'

/** Datos básicos de la organización — nombre y código de invitación. */
export async function getOrganization(
  organizationId: string,
  client?: AppSupabaseClient
): Promise<{ id: string; name: string; joinCode: string } | null> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, join_code')
    .eq('id', organizationId)
    .maybeSingle()

  if (error) throw new DomainError('NOT_FOUND', error.message)
  if (!data) return null
  return { id: data.id, name: data.name, joinCode: data.join_code }
}

/** Grupos de la organización (spec 3.1: conjunto de atletas). */
export async function getGroups(organizationId: string, client?: AppSupabaseClient): Promise<Group[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('groups')
    .select('id, organization_id, name, created_at')
    .eq('organization_id', organizationId)
    .order('name')

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    createdAt: row.created_at,
  }))
}

/** Atletas que pertenecen a un grupo puntual. */
export async function getGroupMembers(groupId: string, client?: AppSupabaseClient): Promise<RosterEntry[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('group_memberships')
    .select('membership:memberships(id, role, status, person:people(first_name, last_name, email))')
    .eq('group_id', groupId)

  if (error) throw new DomainError('NOT_FOUND', error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapRoster((data ?? []).map((row: any) => row.membership).filter(Boolean))
}


export async function getAllMembers(organizationId: string, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from('memberships')
    .select('id, role, status, coach_membership_id, invited_email, person:people(first_name, last_name, email)')
    .eq('organization_id', organizationId)
    .order('status')

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    role: row.role as string,
    status: row.status as string,
    coachMembershipId: row.coach_membership_id as string | null,
    email: row.person?.email ?? row.invited_email ?? null,
    name: row.person ? `${row.person.first_name} ${row.person.last_name}` : null,
  }))
}


export async function getRoster(
  organizationId: string,
  client?: AppSupabaseClient
): Promise<RosterEntry[]> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from('memberships')
    .select('id, role, status, person:people(first_name, last_name, email)')
    .eq('organization_id', organizationId)
    .eq('role', 'athlete')

  if (error) {
    throw new DomainError('NOT_FOUND', error.message)
  }

  return mapRoster(data ?? [])
}

/** Atletas que reportan a un coach puntual. */
export async function getAthletesForCoach(
  coachMembershipId: string,
  client?: AppSupabaseClient
): Promise<RosterEntry[]> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from('memberships')
    .select('id, role, status, person:people(first_name, last_name, email)')
    .eq('coach_membership_id', coachMembershipId)
    .eq('status', 'activo')

  if (error) {
    throw new DomainError('NOT_FOUND', error.message)
  }

  return mapRoster(data ?? [])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRoster(rows: any[]): RosterEntry[] {
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    status: row.status,
    person: row.person
      ? {
          firstName: row.person.first_name,
          lastName: row.person.last_name,
          email: row.person.email,
        }
      : null,
  }))
}

/** Perfil completo del usuario autenticado — para la pantalla Perfil del atleta. */
export async function getMyProfile(client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) return null

  const { data, error } = await supabase
    .from('memberships')
    .select(
      'role, person:people(first_name, last_name, email), organization:organizations(name), coach:coach_membership_id(person:people(first_name, last_name))'
    )
    .eq('id', membership.id)
    .single()

  if (error || !data) throw new DomainError('NOT_FOUND', error?.message ?? 'Perfil no encontrado')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  return {
    firstName: row.person?.first_name ?? '',
    lastName: row.person?.last_name ?? '',
    email: row.person?.email ?? '',
    role: row.role as string,
    organizationName: row.organization?.name ?? '',
    coachName: row.coach?.person ? `${row.coach.person.first_name} ${row.coach.person.last_name}` : null,
  }
}


export async function getMyActiveMembership(
  client?: AppSupabaseClient
): Promise<{ id: string; organizationId: string; role: string } | null> {
  const supabase = client ?? (await createServerClient())
  let user
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    return null // sesión corrupta/vencida -> tratar como "no autenticado"
  }
  if (!user) return null

  const { data, error } = await supabase
    .from('memberships')
    .select('id, organization_id, role')
    .eq('status', 'activo')
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { id: data.id, organizationId: data.organization_id, role: data.role }
}

/**
 * Lista de coaches disponibles para que un atleta elija al registrarse —
 * ANTES de tener sesión (por eso usa service_role, no el cliente normal
 * que depende de auth). Solo expone nombre + organización, nada sensible.
 */
export async function getPublicCoachDirectory(): Promise<CoachDirectoryEntry[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('memberships')
    .select('id, organization_id, people(first_name, last_name), organizations(name)')
    .eq('role', 'coach')
    .eq('status', 'activo')

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row: any) => ({
    membershipId: row.id,
    name: `${row.people?.first_name ?? ''} ${row.people?.last_name ?? ''}`.trim(),
    organizationName: row.organizations?.name ?? '—',
  }))
}
