import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, type Fixtures } from './setup'
import { inviteMember } from '@/domains/athletes/mutations'
import { DomainError } from '@/types/errors'

describe('Permisos por rol', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('manager puede invitar un nuevo miembro', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    const result = await inviteMember(
      {
        organizationId: fixtures.orgA.id,
        email: 'nuevo.atleta@test.entrename.dev',
        role: 'athlete',
        coachMembershipId: fixtures.coachA1.membershipId,
      },
      asManager
    )
    expect(result.id).toBeDefined()
  })

  test('coach NO puede invitar miembros (solo manager)', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    await expect(
      inviteMember(
        {
          organizationId: fixtures.orgA.id,
          email: 'otro@test.entrename.dev',
          role: 'athlete',
          coachMembershipId: fixtures.coachA1.membershipId,
        },
        asCoach
      )
    ).rejects.toBeInstanceOf(DomainError)
  })

  test('athlete NO puede invitar miembros', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    await expect(
      inviteMember(
        { organizationId: fixtures.orgA.id, email: 'x@test.entrename.dev', role: 'athlete' },
        asAthlete
      )
    ).rejects.toMatchObject({ code: 'PERMISSION' })
  })

  test('invitar un atleta sin coach asignado falla con VALIDATION, no llega a tocar la base', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    await expect(
      inviteMember(
        { organizationId: fixtures.orgA.id, email: 'sin.coach@test.entrename.dev', role: 'athlete' },
        asManager
      )
    ).rejects.toMatchObject({ code: 'VALIDATION', field: 'coachMembershipId' })
  })

  test('un manager de Org A no puede invitar dentro de Org B (no pertenece a esa org)', async () => {
    const asManagerA = await supabaseAs(fixtures.managerA)
    await expect(
      inviteMember(
        {
          organizationId: fixtures.orgB.id,
          email: 'intruso@test.entrename.dev',
          role: 'coach',
        },
        asManagerA
      )
    ).rejects.toMatchObject({ code: 'PERMISSION' })
  })
})
