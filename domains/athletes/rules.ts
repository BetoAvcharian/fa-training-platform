import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { Membership, MembershipRole } from './types'

/**
 * Confirma que el usuario autenticado tiene uno de los roles permitidos
 * DENTRO de la organización indicada, y devuelve su membership.
 *
 * Decisiones de diseño (Ticket #2, revisión técnica):
 *
 * 1. `organizationId` NUNCA se usa por sí solo para decidir nada — se usa
 *    únicamente para elegir, entre las memberships REALES del usuario
 *    autenticado, cuál aplica. Evita confiar en un valor que pudo haber
 *    sido manipulado desde el cliente.
 *
 * 2. No usa `.single()` al leer memberships: una persona puede tener más
 *    de una membership activa (ej: un coach que consulta para dos
 *    clubes, caso habilitado desde la Fase 3). `.single()` explotaría con
 *    una excepción cruda de Postgres en ese caso en vez de resolverlo.
 *
 * 3. `client` es inyectable: por defecto usa `createServerClient()` (la
 *    sesión real de la request en producción). Los tests de integración
 *    le pasan un cliente ya autenticado como un fixture puntual —
 *    permite probar RLS y permisos reales contra Postgres sin depender
 *    de cookies()/contexto de request, que no existe en un test runner.
 *    Esto es una dependencia técnica para testabilidad, no una
 *    abstracción de arquitectura nueva (no hay repository/factory acá).
 */
export async function requireRole(
  organizationId: string,
  allowed: MembershipRole[],
  client?: AppSupabaseClient
): Promise<Membership> {
  const supabase = client ?? (await createServerClient())

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new DomainError('PERMISSION', 'No autenticado')
  }

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(
      'id, organization_id, person_id, invited_email, role, status, coach_membership_id, created_at'
    )
    .eq('status', 'activo')

  if (error) {
    throw new DomainError('NOT_FOUND', 'No se pudieron resolver las membresías del usuario')
  }

  const raw = memberships?.find((m) => m.organization_id === organizationId)

  if (!raw) {
    throw new DomainError('PERMISSION', 'No pertenecés a esta organización')
  }
  if (!allowed.includes(raw.role as MembershipRole)) {
    throw new DomainError('PERMISSION', `Se requiere rol: ${allowed.join(' o ')}`)
  }

  return {
    id: raw.id,
    organizationId: raw.organization_id,
    personId: raw.person_id,
    invitedEmail: raw.invited_email,
    role: raw.role as MembershipRole,
    status: raw.status as Membership['status'],
    coachMembershipId: raw.coach_membership_id,
    createdAt: raw.created_at,
  }
}

/** Devuelve la membership activa del usuario autenticado en esa organización, sin exigir un rol puntual. */
export async function requireAuthenticated(
  organizationId: string,
  client?: AppSupabaseClient
): Promise<Membership> {
  return requireRole(organizationId, ['manager', 'coach', 'athlete'], client)
}
