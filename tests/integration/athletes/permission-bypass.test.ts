import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, type Fixtures } from './setup'
import { reassignAthleteCoach } from '@/domains/athletes/mutations'
import { DomainError } from '@/types/errors'

describe('Rechazo de permisos aunque se invoque la mutation directo (sin UI)', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('un coach no puede reasignar el coach de un atleta (acción exclusiva de manager)', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    await expect(
      reassignAthleteCoach(
        {
          athleteMembershipId: fixtures.athlete1.membershipId,
          newCoachMembershipId: fixtures.coachA2.membershipId,
        },
        asCoach
      )
    ).rejects.toMatchObject({ code: 'PERMISSION' })
  })

  test('un atleta no puede reasignarse su propio coach', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    await expect(
      reassignAthleteCoach(
        {
          athleteMembershipId: fixtures.athlete1.membershipId,
          newCoachMembershipId: fixtures.coachA2.membershipId,
        },
        asAthlete
      )
    ).rejects.toBeInstanceOf(DomainError)
  })

  test('un manager de otra organización no puede reasignar atletas ajenos', async () => {
    // coachB pertenece a orgB — no tiene membership en orgA, así que
    // requireRole(orgA, ['manager']) debe rechazarlo por PERMISSION antes
    // de llegar a tocar la fila.
    const asCoachB = await supabaseAs(fixtures.coachB)
    await expect(
      reassignAthleteCoach(
        {
          athleteMembershipId: fixtures.athlete1.membershipId,
          newCoachMembershipId: fixtures.coachB.membershipId,
        },
        asCoachB
      )
    ).rejects.toMatchObject({ code: 'PERMISSION' })
  })
})
