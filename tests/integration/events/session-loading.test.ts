import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'
import { createEvent, addSessionLine } from '@/domains/events/mutations'
import { getSessionExercises, getExceptionMap, getEventAssignments } from '@/domains/events/queries'
import { resolveSessionForAssignment } from '@/domains/events/rules'
import { DomainError } from '@/types/errors'

describe('Carga de sesión — SmartLine + excepciones contra Postgres real', () => {
  let fixtures: Fixtures
  let eventId: string
  let assignment1Id: string
  let assignment2Id: string

  beforeAll(async () => {
    fixtures = await seedFixtures()

    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const event = await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'entrenamiento',
        title: 'Series de pista',
        date: '2026-08-12',
        assignments: [
          { type: 'person', id: fixtures.athlete1.membershipId },
          { type: 'person', id: fixtures.athlete2.membershipId },
        ],
      },
      asCoachA1
    )
    eventId = event.id

    const assignments = await getEventAssignments(eventId, asCoachA1)
    assignment1Id = assignments.find((a) => a.assigneeId === fixtures.athlete1.membershipId)!.id
    assignment2Id = assignments.find((a) => a.assigneeId === fixtures.athlete2.membershipId)!.id
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('una línea bien formada se guarda estructurada', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const result = await addSessionLine(
      { eventId, sportName: 'Atletismo', rawText: "4x400m 1:15 r2'" },
      asCoachA1
    )
    expect(result.parsed.isStructured).toBe(true)
    expect(result.parsed.timeSeconds).toBe(75)
  })

  test('una línea que el parser no entiende se guarda igual, sin bloquear', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const result = await addSessionLine(
      { eventId, sportName: 'Atletismo', rawText: 'trote regenerativo suave' },
      asCoachA1
    )
    expect(result.parsed.isStructured).toBe(false)

    const lines = await getSessionExercises(eventId, asCoachA1)
    expect(lines.some((l) => l.rawText === 'trote regenerativo suave')).toBe(true)
  })

  test('una excepción sin replacesId falla con VALIDATION antes de tocar la base', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    await expect(
      addSessionLine(
        {
          eventId,
          sportName: 'Atletismo',
          rawText: '6x200m',
          exceptionForAssignmentIds: [assignment1Id],
        },
        asCoachA1
      )
    ).rejects.toMatchObject({ code: 'VALIDATION', field: 'replacesId' })
  })

  test('excepción real: athlete1 ve su variante, athlete2 sigue viendo la genérica', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)

    const genericResult = await addSessionLine(
      { eventId, sportName: 'Atletismo', rawText: '4x400m 1:20' },
      asCoachA1
    )

    await addSessionLine(
      {
        eventId,
        sportName: 'Atletismo',
        rawText: '6x200m 0:35',
        exceptionForAssignmentIds: [assignment1Id],
        replacesId: genericResult.id,
      },
      asCoachA1
    )

    const allLines = await getSessionExercises(eventId, asCoachA1)
    const exceptionMap = await getExceptionMap(eventId, asCoachA1)

    const forAthlete1 = resolveSessionForAssignment(allLines, exceptionMap, assignment1Id)
    const forAthlete2 = resolveSessionForAssignment(allLines, exceptionMap, assignment2Id)

    expect(forAthlete1.some((l) => l.rawText === '6x200m 0:35')).toBe(true)
    expect(forAthlete1.some((l) => l.id === genericResult.id)).toBe(false)

    expect(forAthlete2.some((l) => l.id === genericResult.id)).toBe(true)
    expect(forAthlete2.some((l) => l.rawText === '6x200m 0:35')).toBe(false)
  })

  test('un athlete no puede agregar líneas de sesión (solo coach/manager)', async () => {
    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    await expect(
      addSessionLine({ eventId, sportName: 'Atletismo', rawText: '400m 1:15' }, asAthlete1)
    ).rejects.toBeInstanceOf(DomainError)
  })
})
