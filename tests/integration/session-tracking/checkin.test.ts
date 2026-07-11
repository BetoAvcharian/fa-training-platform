import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, type Fixtures } from '../athletes/setup'
import { submitCheckin, hasCheckinForDate } from '@/domains/observations/checkin'
import { getVigentObservations } from '@/domains/observations/queries'
import { DomainError } from '@/types/errors'

describe('Check-in diario — no bloqueante, Energía/Fatiga/Molestia como Observations', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('cargar energía y fatiga genera dos Observations, con source_type=checkin', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const result = await submitCheckin(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, date: '2026-07-01', energia: 4, fatiga: 2 },
      asAthlete
    )
    expect(result.ids).toHaveLength(2)
  })

  test('hasCheckinForDate detecta el check-in recién cargado', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const has = await hasCheckinForDate(fixtures.athlete1.membershipId, '2026-07-01', asAthlete)
    expect(has).toBe(true)
  })

  test('un día sin check-in cargado, hasCheckinForDate devuelve false (ausencia = información)', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const has = await hasCheckinForDate(fixtures.athlete1.membershipId, '2026-07-02', asAthlete)
    expect(has).toBe(false)
  })

  test('cargar solo molestia (sin energía ni fatiga) también es válido', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete2)
    const result = await submitCheckin(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, date: '2026-07-03', molestia: 1 },
      asAthlete
    )
    expect(result.ids).toHaveLength(1)
  })

  test('check-in completamente vacío falla con VALIDATION', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    await expect(
      submitCheckin({ organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, date: '2026-07-04' }, asAthlete)
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  test('un atleta no puede cargar el check-in de otro', async () => {
    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    await expect(
      submitCheckin(
        { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, date: '2026-07-05', energia: 3 },
        asAthlete1
      )
    ).rejects.toBeInstanceOf(DomainError)
  })

  test('un coach no puede cargar check-in (es exclusivo del propio atleta)', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    await expect(
      submitCheckin(
        { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, date: '2026-07-06', energia: 3 },
        asCoach
      )
    ).rejects.toBeInstanceOf(DomainError)
  })

  test('la energía cargada aparece como Observation vigente consultable', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const observations = await getVigentObservations(
      fixtures.athlete1.membershipId,
      { sourceType: 'checkin', from: '2026-07-01', to: '2026-07-01' },
      asAthlete
    )
    expect(observations.length).toBeGreaterThanOrEqual(2)
  })
})
