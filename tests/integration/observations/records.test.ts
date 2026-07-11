import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'
import { createObservation } from '@/domains/observations/mutations'
import { getRecords } from '@/domains/observations/queries'

describe('Observation -> Record automático (contra Postgres real, no mocks)', () => {
  let fixtures: Fixtures
  let observableId: string
  let windContextKeyId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const { data: obl } = await serviceClient.from('observables').select('id').eq('name', '100m').is('organization_id', null).single()
    observableId = obl!.id
    const { data: ck } = await serviceClient.from('context_keys').select('id').eq('name', 'viento').is('organization_id', null).single()
    windContextKeyId = ck!.id
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('la mejor marca entre varias, cargadas fuera de orden cronológico, queda como récord', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)

    await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 11.2, date: '2026-03-01', sourceType: 'entrenamiento' },
      asAthlete
    )
    await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 10.85, date: '2026-05-01', sourceType: 'entrenamiento' },
      asAthlete
    )
    await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 11.05, date: '2026-04-01', sourceType: 'entrenamiento' },
      asAthlete
    )

    const records = await getRecords(fixtures.athlete1.membershipId, asAthlete)
    const record = records.find((r) => r.observableId === observableId && r.recordType === 'entrenamiento')
    expect(record?.value).toBe(10.85)
  })

  test('una marca oficial y una de entrenamiento del mismo atleta/prueba quedan como DOS récords separados', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)

    await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 10.55, date: '2026-06-01', sourceType: 'competencia' },
      asCoach
    )

    const records = await getRecords(fixtures.athlete1.membershipId, asCoach)
    const oficial = records.find((r) => r.observableId === observableId && r.recordType === 'oficial')
    const entrenamiento = records.find((r) => r.observableId === observableId && r.recordType === 'entrenamiento')

    expect(oficial?.value).toBe(10.55)
    expect(entrenamiento?.value).toBe(10.85) // no se tocó
  })

  test('viento excesivo NO permite que una marca más rápida se convierta en récord', async () => {
    const asAthlete2 = await supabaseAs(fixtures.athlete2)

    await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, observableId, value: 11.0, date: '2026-03-01', sourceType: 'entrenamiento' },
      asAthlete2
    )

    await createObservation(
      {
        organizationId: fixtures.orgA.id,
        athleteMembershipId: fixtures.athlete2.membershipId,
        observableId,
        value: 10.4, // más rápida
        date: '2026-04-01',
        sourceType: 'entrenamiento',
        context: { [windContextKeyId]: 3.5 }, // viento excesivo, en la MISMA llamada
      },
      asAthlete2
    )

    const records = await getRecords(fixtures.athlete2.membershipId, asAthlete2)
    const record = records.find((r) => r.observableId === observableId && r.recordType === 'entrenamiento')
    expect(record?.value).toBe(11.0) // se mantiene la marca sin viento
  })

  test('un atleta no puede cargar Observations de otro atleta', async () => {
    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    await expect(
      createObservation(
        { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, observableId, value: 10.0, date: '2026-07-01', sourceType: 'manual' },
        asAthlete1
      )
    ).rejects.toMatchObject({ code: 'PERMISSION' })
  })

  test('un coach no puede cargar Observations de un atleta que no es suyo', async () => {
    const asCoachA2 = await supabaseAs(fixtures.coachA2) // coach de athlete2, no de athlete1
    await expect(
      createObservation(
        { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 10.0, date: '2026-07-01', sourceType: 'manual' },
        asCoachA2
      )
    ).rejects.toMatchObject({ code: 'PERMISSION' })
  })
})
