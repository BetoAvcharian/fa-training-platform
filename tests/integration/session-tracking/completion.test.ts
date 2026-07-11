import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'
import { createEvent, addSessionLine } from '@/domains/events/mutations'
import { getEventAssignments } from '@/domains/events/queries'
import { completeSessionLine } from '@/domains/observations/completion'
import { getResolvedSessionForAthlete } from '@/domains/observations/session-view'
import { DomainError } from '@/types/errors'

describe('Completar sesión — conecta lo planificado (Ticket #4) con lo ejecutado (Ticket #5)', () => {
  let fixtures: Fixtures
  let eventId: string
  let lineId: string
  let unstructuredLineId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const asCoach = await supabaseAs(fixtures.coachA1)

    const event = await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'entrenamiento',
        title: 'Sesión de prueba',
        date: '2026-08-20',
        assignments: [{ type: 'person', id: fixtures.athlete1.membershipId }],
      },
      asCoach
    )
    eventId = event.id

    const line = await addSessionLine({ eventId, sportName: 'Atletismo', rawText: '400m 1:15' }, asCoach)
    lineId = line.id

    const unstructured = await addSessionLine({ eventId, sportName: 'Atletismo', rawText: 'trote libre, sin números' }, asCoach)
    unstructuredLineId = unstructured.id
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('antes de completar, la vista resuelta muestra la línea sin ejecución', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const resolved = await getResolvedSessionForAthlete(eventId, fixtures.athlete1.membershipId, asAthlete)
    const target = resolved.find((r) => r.line.id === lineId)
    expect(target?.executed).toBeNull()
  })

  test('completar tal cual lo planificado usa el valor prescripto', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const result = await completeSessionLine({ sessionExerciseId: lineId, athleteMembershipId: fixtures.athlete1.membershipId }, asAthlete)

    expect(result.plannedId).toBeDefined()
    expect(result.executedId).toBeDefined()

    const { data: planned } = await serviceClient.from('observations').select('value, state').eq('id', result.plannedId).single()
    const { data: executed } = await serviceClient.from('observations').select('value, state, fulfills_observation_id').eq('id', result.executedId).single()

    expect(planned?.value).toBe(75) // 1:15 -> 75 segundos
    expect(planned?.state).toBe('planificado')
    expect(executed?.value).toBe(75)
    expect(executed?.state).toBe('ejecutado')
    expect(executed?.fulfills_observation_id).toBe(result.plannedId)
  })

  test('después de completar, la vista resuelta muestra el valor ejecutado', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const resolved = await getResolvedSessionForAthlete(eventId, fixtures.athlete1.membershipId, asAthlete)
    const target = resolved.find((r) => r.line.id === lineId)
    expect(target?.executed?.value).toBe(75)
  })

  test('completar con un valor real distinto (corrió más rápido) queda registrado tal cual, planificado sigue en 75', async () => {
    // Nueva línea para no interferir con el test anterior
    const asCoach = await supabaseAs(fixtures.coachA1)
    const line2 = await addSessionLine({ eventId, sportName: 'Atletismo', rawText: '400m 1:20' }, asCoach)

    const asAthlete = await supabaseAs(fixtures.athlete1)
    const result = await completeSessionLine(
      { sessionExerciseId: line2.id, athleteMembershipId: fixtures.athlete1.membershipId, actualValue: 77 },
      asAthlete
    )

    const { data: planned } = await serviceClient.from('observations').select('value').eq('id', result.plannedId).single()
    const { data: executed } = await serviceClient.from('observations').select('value').eq('id', result.executedId).single()

    expect(planned?.value).toBe(80) // 1:20 prescripto
    expect(executed?.value).toBe(77) // real, distinto de lo prescripto
  })

  test('no se puede completar una línea sin estructurar', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    await expect(
      completeSessionLine({ sessionExerciseId: unstructuredLineId, athleteMembershipId: fixtures.athlete1.membershipId }, asAthlete)
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  test('un atleta no puede completar la sesión de otro', async () => {
    const asAthlete2 = await supabaseAs(fixtures.athlete2)
    await expect(
      completeSessionLine({ sessionExerciseId: lineId, athleteMembershipId: fixtures.athlete1.membershipId }, asAthlete2)
    ).rejects.toBeInstanceOf(DomainError)
  })

  test('completar la misma línea dos veces reutiliza la MISMA Observation planificada (no duplica)', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    const line3 = await addSessionLine({ eventId, sportName: 'Atletismo', rawText: '400m 1:10' }, asCoach)

    const asAthlete = await supabaseAs(fixtures.athlete1)
    const first = await completeSessionLine({ sessionExerciseId: line3.id, athleteMembershipId: fixtures.athlete1.membershipId }, asAthlete)
    const second = await completeSessionLine(
      { sessionExerciseId: line3.id, athleteMembershipId: fixtures.athlete1.membershipId, actualValue: 68 },
      asAthlete
    )

    expect(second.plannedId).toBe(first.plannedId) // no se generó una segunda planificada
    expect(second.executedId).not.toBe(first.executedId) // pero sí una nueva ejecución
  })
})
