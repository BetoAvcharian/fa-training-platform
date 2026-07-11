import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from './setup'
import { reassignAthleteCoach } from '@/domains/athletes/mutations'

describe('Reasignación de coach sin pérdida de historial', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('reasignar coach actualiza la relación y revoca acceso del coach anterior', async () => {
    const asManager = await supabaseAs(fixtures.managerA)

    await reassignAthleteCoach(
      {
        athleteMembershipId: fixtures.athlete1.membershipId,
        newCoachMembershipId: fixtures.coachA2.membershipId,
      },
      asManager
    )

    // La membership de athlete1 ahora apunta a coachA2
    const { data: membership } = await serviceClient
      .from('memberships')
      .select('coach_membership_id')
      .eq('id', fixtures.athlete1.membershipId)
      .single()
    expect(membership?.coach_membership_id).toBe(fixtures.coachA2.membershipId)

    // coachA1 (el anterior) pierde acceso a la ficha de la persona de athlete1
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const { data: coach1Sees } = await asCoachA1
      .from('people')
      .select('*')
      .eq('id', fixtures.athlete1.personId)
    expect(coach1Sees).toHaveLength(0)

    // coachA2 (el nuevo) gana acceso
    const asCoachA2 = await supabaseAs(fixtures.coachA2)
    const { data: coach2Sees } = await asCoachA2
      .from('people')
      .select('*')
      .eq('id', fixtures.athlete1.personId)
    expect(coach2Sees).toHaveLength(1)
  })

  test('la Person del atleta no se toca ni se recrea al reasignar', async () => {
    const { data: personBefore } = await serviceClient
      .from('people')
      .select('id, created_at')
      .eq('id', fixtures.athlete1.personId)
      .single()

    const asManager = await supabaseAs(fixtures.managerA)
    await reassignAthleteCoach(
      {
        athleteMembershipId: fixtures.athlete1.membershipId,
        newCoachMembershipId: fixtures.coachA1.membershipId, // vuelve a coachA1
      },
      asManager
    )

    const { data: personAfter } = await serviceClient
      .from('people')
      .select('id, created_at')
      .eq('id', fixtures.athlete1.personId)
      .single()

    expect(personAfter?.id).toBe(personBefore?.id)
    expect(personAfter?.created_at).toBe(personBefore?.created_at)
  })
})
