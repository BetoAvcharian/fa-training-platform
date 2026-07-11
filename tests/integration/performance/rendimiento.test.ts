import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'
import { createObservation, correctObservation } from '@/domains/observations/mutations'
import { getProgressionSeries, getAllObservationsWithStatus } from '@/domains/observations/queries'
import { compareAthletes } from '@/domains/performance/queries'
import { DomainError } from '@/types/errors'

describe('Rendimiento — Progresión, tabla de resultados, comparación', () => {
  let fixtures: Fixtures
  let observableId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const { data } = await serviceClient.from('observables').select('id').eq('name', '1500m').is('organization_id', null).maybeSingle()
    if (data) {
      observableId = data.id
    } else {
      const { data: sport } = await serviceClient.from('sports').select('id').eq('name', 'Atletismo').is('organization_id', null).single()
      const { data: unit } = await serviceClient.from('units').select('id').eq('name', 'Segundo').is('organization_id', null).single()
      const { data: created } = await serviceClient
        .from('observables')
        .insert({ organization_id: null, sport_id: sport!.id, unit_id: unit!.id, name: `1500m-test-${Date.now()}`, is_performance: true })
        .select('id')
        .single()
      observableId = created!.id
    }
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('Progresión: la serie sale ordenada por fecha, solo lo vigente', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    await createObservation({ organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 280, date: '2026-02-01', sourceType: 'entrenamiento' }, asAthlete)
    await createObservation({ organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 275, date: '2026-04-01', sourceType: 'entrenamiento' }, asAthlete)
    await createObservation({ organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 278, date: '2026-03-01', sourceType: 'entrenamiento' }, asAthlete)

    const series = await getProgressionSeries(fixtures.athlete1.membershipId, observableId, {}, asAthlete)
    expect(series.map((s) => s.date)).toEqual(['2026-02-01', '2026-03-01', '2026-04-01'])
  })

  test('Tabla de resultados: una corrección aparece DOS veces, una vigente y una reemplazada', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete2)
    const original = await createObservation({ organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, observableId, value: 290, date: '2026-05-01', sourceType: 'manual' }, asAthlete)
    await correctObservation({ observationId: original.id, newValue: 288 }, asAthlete)

    const table = await getAllObservationsWithStatus(fixtures.athlete2.membershipId, { observableId }, asAthlete)
    const vigente = table.find((r) => r.status === 'vigente')
    const reemplazada = table.find((r) => r.status === 'reemplazada')

    expect(vigente?.value).toBe(288)
    expect(reemplazada?.value).toBe(290)
    expect(reemplazada?.id).toBe(original.id)
  })

  test('Comparar: junta las series de dos atletas distintos', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    const result = await compareAthletes(
      { organizationId: fixtures.orgA.id, athleteMembershipIds: [fixtures.athlete1.membershipId, fixtures.athlete2.membershipId], observableId },
      asCoach
    )
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.athleteMembershipId === fixtures.athlete1.membershipId)?.points.length).toBeGreaterThan(0)
  })

  test('Comparar con un solo atleta falla con VALIDATION (hacen falta al menos 2)', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    await expect(
      compareAthletes({ organizationId: fixtures.orgA.id, athleteMembershipIds: [fixtures.athlete1.membershipId], observableId }, asCoach)
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  test('un atleta no puede usar Comparar (exclusivo de coach/manager)', async () => {
    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    await expect(
      compareAthletes(
        { organizationId: fixtures.orgA.id, athleteMembershipIds: [fixtures.athlete1.membershipId, fixtures.athlete2.membershipId], observableId },
        asAthlete1
      )
    ).rejects.toBeInstanceOf(DomainError)
  })
})
