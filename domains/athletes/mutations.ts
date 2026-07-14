import { createServerClient, createServiceClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from './rules'
import { logAudit } from '@/domains/audit/mutations'
import type {
  InviteMemberInput,
  ReassignAthleteCoachInput,
  DeactivateMemberInput,
  SignUpManagerInput,
  SignUpCoachInput,
  SignUpAthleteInput,
  CreateGroupInput,
} from './types'

export async function addAthleteToGroup(
  input: { groupId: string; athleteMembershipId: string; organizationId: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { error } = await supabase
    .from('group_memberships')
    .insert({ group_id: input.groupId, membership_id: input.athleteMembershipId })

  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'group.create',
    entityType: 'group_membership',
    entityId: input.groupId,
    metadata: { athleteMembershipId: input.athleteMembershipId },
  })
}

export async function removeAthleteFromGroup(
  input: { groupId: string; athleteMembershipId: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const { error } = await supabase
    .from('group_memberships')
    .delete()
    .eq('group_id', input.groupId)
    .eq('membership_id', input.athleteMembershipId)

  if (error) throw new DomainError('CONFLICT', error.message)
}

export async function createGroup(input: CreateGroupInput, client?: AppSupabaseClient): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { data, error } = await supabase
    .from('groups')
    .insert({ organization_id: input.organizationId, name: input.name })
    .select('id')
    .single()

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear el grupo')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'group.create',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: input.name },
  })

  return { id: data.id }
}

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

// ============================================================
// Registro — crea la cuenta de auth + Person + Membership en un solo
// paso. Usa service_role a propósito: no existe policy de INSERT en
// `people` para 'authenticated' (no hay auto-registro libre, cada fila
// nueva de identidad pasa por acá, con validación explícita) — es
// consistente con "toda escritura sensible pasa por la capa de dominio".
// ============================================================

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O, 1/I (ambiguos)
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function signUpManager(input: SignUpManagerInput) {
  const admin = createServiceClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    throw new DomainError('CONFLICT', authError?.message ?? 'No se pudo crear la cuenta')
  }

  const { data: person, error: personError } = await admin
    .from('people')
    .insert({ auth_user_id: authData.user.id, first_name: input.firstName, last_name: input.lastName, email: input.email })
    .select('id')
    .single()
  if (personError || !person) {
    throw new DomainError('CONFLICT', personError?.message ?? 'No se pudo crear la persona')
  }

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: input.organizationName, join_code: generateJoinCode() })
    .select('id')
    .single()
  if (orgError || !org) {
    throw new DomainError('CONFLICT', orgError?.message ?? 'No se pudo crear la organización')
  }

  const { error: membershipError } = await admin
    .from('memberships')
    .insert({ organization_id: org.id, person_id: person.id, role: 'manager', status: 'activo' })
  if (membershipError) {
    throw new DomainError('CONFLICT', membershipError.message)
  }

  // Login inmediato para que quede con sesión activa — el JWT ya sale con
  // los claims correctos porque el hook los resuelve al momento de emitir
  // el token, y la membership ya existe en este punto.
  const supabase = await createServerClient()
  await supabase.auth.signInWithPassword({ email: input.email, password: input.password })

  return { organizationId: org.id }
}

export async function signUpCoach(input: SignUpCoachInput) {
  const admin = createServiceClient()

  const { data: org, error: orgLookupError } = await admin
    .from('organizations')
    .select('id')
    .eq('join_code', input.joinCode.toUpperCase().trim())
    .maybeSingle()

  if (orgLookupError || !org) {
    throw new DomainError('VALIDATION', 'Ese código de equipo no existe', 'joinCode')
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    throw new DomainError('CONFLICT', authError?.message ?? 'No se pudo crear la cuenta')
  }

  const { data: person, error: personError } = await admin
    .from('people')
    .insert({ auth_user_id: authData.user.id, first_name: input.firstName, last_name: input.lastName, email: input.email })
    .select('id')
    .single()
  if (personError || !person) {
    throw new DomainError('CONFLICT', personError?.message ?? 'No se pudo crear la persona')
  }

  const { error: membershipError } = await admin
    .from('memberships')
    .insert({ organization_id: org.id, person_id: person.id, role: 'coach', status: 'activo' })
  if (membershipError) {
    throw new DomainError('CONFLICT', membershipError.message)
  }

  const supabase = await createServerClient()
  await supabase.auth.signInWithPassword({ email: input.email, password: input.password })

  return { organizationId: org.id }
}

export async function signUpAthlete(input: SignUpAthleteInput) {
  const admin = createServiceClient()

  const { data: coachMembership, error: coachLookupError } = await admin
    .from('memberships')
    .select('organization_id, role')
    .eq('id', input.coachMembershipId)
    .maybeSingle()

  if (coachLookupError || !coachMembership || coachMembership.role !== 'coach') {
    throw new DomainError('VALIDATION', 'Entrenador inválido', 'coachMembershipId')
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    throw new DomainError('CONFLICT', authError?.message ?? 'No se pudo crear la cuenta')
  }

  const { data: person, error: personError } = await admin
    .from('people')
    .insert({ auth_user_id: authData.user.id, first_name: input.firstName, last_name: input.lastName, email: input.email })
    .select('id')
    .single()
  if (personError || !person) {
    throw new DomainError('CONFLICT', personError?.message ?? 'No se pudo crear la persona')
  }

  const { error: membershipError } = await admin.from('memberships').insert({
    organization_id: coachMembership.organization_id,
    person_id: person.id,
    role: 'athlete',
    status: 'activo',
    coach_membership_id: input.coachMembershipId,
  })
  if (membershipError) {
    throw new DomainError('CONFLICT', membershipError.message)
  }

  const supabase = await createServerClient()
  await supabase.auth.signInWithPassword({ email: input.email, password: input.password })

  return { organizationId: coachMembership.organization_id }
}

/** El propio usuario edita sus datos personales (género, fecha de nacimiento, teléfono, club). */
export async function updateMyProfile(
  input: { birthDate?: string; gender?: string; phone?: string; club?: string; photoUrl?: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new DomainError('PERMISSION', 'No autenticado')

  const patch: Record<string, unknown> = {}
  if (input.birthDate !== undefined) patch.birth_date = input.birthDate || null
  if (input.gender !== undefined) patch.gender = input.gender || null
  if (input.phone !== undefined) patch.phone = input.phone || null
  if (input.club !== undefined) patch.club = input.club || null
  if (input.photoUrl !== undefined) patch.photo_url = input.photoUrl || null

  const { error } = await supabase.from('people').update(patch).eq('auth_user_id', user.id)
  if (error) throw new DomainError('CONFLICT', error.message)
}
