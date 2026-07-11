import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ⚠️ Archivo agregado más allá de la lista de entrega original: los 7
// tests no pueden ser código real sin una forma de crear usuarios
// autenticados de verdad y un cliente que respete RLS por fixture. Vive
// junto a los tests de athletes porque hoy solo ellos lo usan — si un
// dominio nuevo lo necesita, se promueve a /tests/helpers/.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_PASSWORD = 'test-password-1234!'

/** Cliente service_role — solo para armar/desarmar fixtures, nunca se usa como "actor" de un test. */
export const serviceClient: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface FixturePerson {
  authUserId: string
  personId: string
  email: string
  membershipId: string
}

export interface Fixtures {
  orgA: { id: string }
  orgB: { id: string }
  managerA: FixturePerson
  coachA1: FixturePerson
  coachA2: FixturePerson
  coachB: FixturePerson
  athlete1: FixturePerson // reporta a coachA1
  athlete2: FixturePerson // reporta a coachA2 — mismo org que athlete1, distinto coach
}

async function createAuthAndPerson(email: string, firstName: string, lastName: string) {
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    throw new Error(`No se pudo crear auth user ${email}: ${authError?.message}`)
  }

  const { data: person, error: personError } = await serviceClient
    .from('people')
    .insert({ auth_user_id: authData.user.id, first_name: firstName, last_name: lastName, email })
    .select('id')
    .single()

  if (personError || !person) {
    throw new Error(`No se pudo crear person ${email}: ${personError?.message}`)
  }

  return { authUserId: authData.user.id as string, personId: person.id as string, email }
}

async function createMembership(input: {
  organizationId: string
  personId: string
  role: 'manager' | 'coach' | 'athlete'
  coachMembershipId?: string
}) {
  const { data, error } = await serviceClient
    .from('memberships')
    .insert({
      organization_id: input.organizationId,
      person_id: input.personId,
      role: input.role,
      status: 'activo',
      coach_membership_id: input.coachMembershipId ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`No se pudo crear membership: ${error?.message}`)
  }
  return data.id as string
}

/**
 * Set completo de fixtures para los tests de identidad:
 * - orgA: managerA, coachA1, coachA2, athlete1 (→coachA1), athlete2 (→coachA2)
 * - orgB: coachB (para los tests de aislamiento cross-org)
 */
export async function seedFixtures(): Promise<Fixtures> {
  const suffix = Date.now()

  const { data: orgA, error: orgAError } = await serviceClient
    .from('organizations')
    .insert({ name: `Org A - Test ${suffix}`, join_code: `TESTA${suffix}` })
    .select('id')
    .single()
  const { data: orgB, error: orgBError } = await serviceClient
    .from('organizations')
    .insert({ name: `Org B - Test ${suffix}`, join_code: `TESTB${suffix}` })
    .select('id')
    .single()

  if (orgAError || orgBError || !orgA || !orgB) {
    throw new Error('No se pudieron crear las organizaciones de prueba')
  }

  const managerAPerson = await createAuthAndPerson(`manager.a.${suffix}@test.entrename.dev`, 'Manager', 'A')
  const coachA1Person = await createAuthAndPerson(`coach.a1.${suffix}@test.entrename.dev`, 'Coach', 'A1')
  const coachA2Person = await createAuthAndPerson(`coach.a2.${suffix}@test.entrename.dev`, 'Coach', 'A2')
  const coachBPerson = await createAuthAndPerson(`coach.b.${suffix}@test.entrename.dev`, 'Coach', 'B')
  const athlete1Person = await createAuthAndPerson(`athlete.1.${suffix}@test.entrename.dev`, 'Athlete', 'One')
  const athlete2Person = await createAuthAndPerson(`athlete.2.${suffix}@test.entrename.dev`, 'Athlete', 'Two')

  const managerAMembershipId = await createMembership({
    organizationId: orgA.id,
    personId: managerAPerson.personId,
    role: 'manager',
  })
  const coachA1MembershipId = await createMembership({
    organizationId: orgA.id,
    personId: coachA1Person.personId,
    role: 'coach',
  })
  const coachA2MembershipId = await createMembership({
    organizationId: orgA.id,
    personId: coachA2Person.personId,
    role: 'coach',
  })
  const coachBMembershipId = await createMembership({
    organizationId: orgB.id,
    personId: coachBPerson.personId,
    role: 'coach',
  })
  const athlete1MembershipId = await createMembership({
    organizationId: orgA.id,
    personId: athlete1Person.personId,
    role: 'athlete',
    coachMembershipId: coachA1MembershipId,
  })
  const athlete2MembershipId = await createMembership({
    organizationId: orgA.id,
    personId: athlete2Person.personId,
    role: 'athlete',
    coachMembershipId: coachA2MembershipId,
  })

  return {
    orgA: { id: orgA.id },
    orgB: { id: orgB.id },
    managerA: { ...managerAPerson, membershipId: managerAMembershipId },
    coachA1: { ...coachA1Person, membershipId: coachA1MembershipId },
    coachA2: { ...coachA2Person, membershipId: coachA2MembershipId },
    coachB: { ...coachBPerson, membershipId: coachBMembershipId },
    athlete1: { ...athlete1Person, membershipId: athlete1MembershipId },
    athlete2: { ...athlete2Person, membershipId: athlete2MembershipId },
  }
}

/** Cliente Supabase autenticado como un fixture puntual — respeta RLS de verdad. */
export async function supabaseAs(person: FixturePerson): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { error } = await client.auth.signInWithPassword({
    email: person.email,
    password: TEST_PASSWORD,
  })
  if (error) {
    throw new Error(`No se pudo autenticar como ${person.email}: ${error.message}`)
  }
  return client
}

export async function teardownFixtures(fixtures: Fixtures) {
  const people = [
    fixtures.managerA,
    fixtures.coachA1,
    fixtures.coachA2,
    fixtures.coachB,
    fixtures.athlete1,
    fixtures.athlete2,
  ]
  for (const person of people) {
    await serviceClient.auth.admin.deleteUser(person.authUserId)
  }
  // people/memberships/audit_logs de estas organizaciones caen en cascada
  // (on delete cascade desde organization_id) al borrar las orgs.
  await serviceClient.from('organizations').delete().in('id', [fixtures.orgA.id, fixtures.orgB.id])
}
