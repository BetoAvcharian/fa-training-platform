import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'
import { createObservation, correctObservation } from '@/domains/observations/mutations'
import { getRecords, getVigentObservations } from '@/domains/observations/queries'

describe('Corrección de Observation (superseded_by) + recómputo de récord', () => {
  let fixtures: Fixtures
  let observableId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const { data: obl } = await serviceClient.from('observables').select('id').eq('name', '800m').is('organization_id', null).maybeSingle()
    if (obl) {
      observableId = obl.id
    } else {
      // 800m no está en el seed original de este proyecto de prueba — se
      // crea uno ad-hoc para no depender de qué exista en el catálogo.
      const { data: sport } = await serviceClient.from('sports').select('id').eq('name', 'Atletismo').is('organization_id', null).single()
      const { data: unit } = await serviceClient.from('units').select('id').eq('name', 'Segundo').is('organization_id', null).single()
      const { data: created } = await serviceClient
        .from('observables')
        .insert({ organization_id: null, sport_id: sport!.id, unit_id: unit!.id, name: `800m-test-${Date.now()}`, is_performance: true, higher_is_better: false })
        .select('id')
        .single()
      observableId = created!.id
    }
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('corregir una marca que NO es el récord vigente no afecta al récord', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)

    const best = await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 130, date: '2026-03-01', sourceType: 'entrenamiento' },
      asAthlete
    )
    const worse = await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 140, date: '2026-03-05', sourceType: 'entrenamiento' },
      asAthlete
    )

    await correctObservation({ observationId: worse.id, newValue: 145 }, asAthlete)

    const records = await getRecords(fixtures.athlete1.membershipId, asAthlete)
    const record = records.find((r) => r.observableId === observableId && r.recordType === 'entrenamiento')
    expect(record?.value).toBe(130) // sigue siendo la mejor marca, no la corregida
    expect(record?.bestObservationId).toBe(best.id)
  })

  test('corregir el récord vigente hacia un valor PEOR recalcula contra el resto del historial (no se queda con el valor viejo)', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete2)

    const segunda = await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, observableId, value: 132, date: '2026-02-01', sourceType: 'entrenamiento' },
      asAthlete
    )
    const record = await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, observableId, value: 128, date: '2026-03-01', sourceType: 'entrenamiento' },
      asAthlete
    )

    let records = await getRecords(fixtures.athlete2.membershipId, asAthlete)
    expect(records.find((r) => r.observableId === observableId)?.value).toBe(128)

    // Se corrige la marca RÉCORD hacia un valor peor que la segunda mejor
    await correctObservation({ observationId: record.id, newValue: 135, reason: 'error de cronómetro' }, asAthlete)

    records = await getRecords(fixtures.athlete2.membershipId, asAthlete)
    const recomputed = records.find((r) => r.observableId === observableId && r.recordType === 'entrenamiento')

    // El nuevo récord es la "segunda mejor" (132), NO la corrección (135)
    // ni el valor viejo (128, que ya no es vigente)
    expect(recomputed?.value).toBe(132)
    expect(recomputed?.bestObservationId).toBe(segunda.id)
  })

  test('la Observation vieja queda marcada como no vigente, pero sigue existiendo (no se borra)', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)

    const original = await createObservation(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete1.membershipId, observableId, value: 150, date: '2026-06-01', sourceType: 'manual' },
      asAthlete
    )
    await correctObservation({ observationId: original.id, newValue: 148 }, asAthlete)

    const { data: oldRow } = await serviceClient.from('observations').select('superseded_by').eq('id', original.id).single()
    expect(oldRow?.superseded_by).not.toBeNull()

    const vigentes = await getVigentObservations(fixtures.athlete1.membershipId, { observableId }, asAthlete)
    expect(vigentes.some((o) => o.id === original.id)).toBe(false) // la vieja no aparece como vigente
    expect(vigentes.some((o) => o.value === 148)).toBe(true) // la corrección sí
  })
})
