import { createServerClient, createServiceClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { RosterEntry, CoachDirectoryEntry } from './types'

/** Lista de atletas de la organización — RLS resuelve qué ve cada rol (manager: todos, coach: solo los suyos). */
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

/** La membership activa del usuario autenticado — base para redirigir según rol al entrar. */
export async function getMyActiveMembership(
  client?: AppSupabaseClient
): Promise<{ id: string; organizationId: string; role: string } | null> {
  const supabase = client ?? (await createServerClient())
  const { data: { user } } = await supabase.auth.getUser()
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
