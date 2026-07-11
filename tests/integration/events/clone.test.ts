import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, type Fixtures } from '../athletes/setup'
import { createEvent, addSessionLine, cloneEvent } from '@/domains/events/mutations'
import { getSessionExercises, getEventAssignments } from '@/domains/events/queries'

describe('cloneEvent — un solo mecanismo para plantillas, duplicar semana y copiar entre atletas', () => {
  let fixtures: Fixtures
  let sourceEventId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const asCoachA1 = await supabaseAs(fixtures.coachA1)

    const source = await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'entrenamiento',
        title: 'Semana base',
        date: '2026-08-01',
        assignments: [{ type: 'person', id: fixtures.athlete1.membershipId }],
      },
      asCoachA1
    )
    sourceEventId = source.id

    await addSessionLine({ eventId: sourceEventId, sportName: 'Atletismo', rawText: '4x400m 1:15' }, asCoachA1)
    await addSessionLine({ eventId: sourceEventId, sportName: 'Fuerza', rawText: 'Sentadilla 4x8x120kg' }, asCoachA1)
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('clonar sin especificar asignaciones nuevas copia las del origen', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const cloned = await cloneEvent({ sourceEventId, newDate: '2026-08-08' }, asCoachA1)

    const assignments = await getEventAssignments(cloned.id, asCoachA1)
    expect(assignments).toHaveLength(1)
    expect(assignments[0].assigneeId).toBe(fixtures.athlete1.membershipId)
  })

  test('clonar copia las líneas genéricas de la sesión', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const cloned = await cloneEvent({ sourceEventId, newDate: '2026-08-15' }, asCoachA1)

    const clonedLines = await getSessionExercises(cloned.id, asCoachA1)
    expect(clonedLines).toHaveLength(2)
    expect(clonedLines.some((l) => l.rawText === '4x400m 1:15')).toBe(true)
    expect(clonedLines.some((l) => l.rawText === 'Sentadilla 4x8x120kg')).toBe(true)
  })

  test('clonar con nuevas asignaciones permite copiar entre atletas (no solo duplicar semana)', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const cloned = await cloneEvent(
      {
        sourceEventId,
        newDate: '2026-08-08',
        newAssignments: [{ type: 'person', id: fixtures.athlete2.membershipId }],
      },
      asCoachA1
    )

    const assignments = await getEventAssignments(cloned.id, asCoachA1)
    expect(assignments).toHaveLength(1)
    expect(assignments[0].assigneeId).toBe(fixtures.athlete2.membershipId)
  })

  test('el Event original no se modifica al clonarlo', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    await cloneEvent({ sourceEventId, newDate: '2026-08-22' }, asCoachA1)

    const originalLines = await getSessionExercises(sourceEventId, asCoachA1)
    expect(originalLines).toHaveLength(2)
  })
})
