import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, type Fixtures } from '../athletes/setup'
import { createEvent, addSessionLine } from '@/domains/events/mutations'
import { completeSessionLine } from '@/domains/observations/completion'
import { submitCheckin } from '@/domains/observations/checkin'
import {
  getAthletesWithoutExecutionSince,
  getWellnessAlerts,
  getUpcomingCompetitions,
  getTodaySummary,
} from '@/domains/dashboard/queries'

describe('Dashboard — alertas sobre datos reales, sin tabla nueva', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('atleta sin ninguna ejecución reciente aparece en la alerta', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    const alerts = await getAthletesWithoutExecutionSince(fixtures.coachA1.membershipId, '2020-01-01', asCoach)
    // athlete1 reporta a coachA1 y en este test todavía no ejecutó nada
    expect(alerts.some((a) => a.athleteMembershipId === fixtures.athlete1.membershipId)).toBe(true)
  })

  test('después de ejecutar algo, deja de aparecer en la alerta de "sin registrar"', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    const event = await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'entrenamiento',
        title: 'Sesión dashboard test',
        date: '2026-09-01',
        assignments: [{ type: 'person', id: fixtures.athlete1.membershipId }],
      },
      asCoach
    )
    const line = await addSessionLine({ eventId: event.id, sportName: 'Atletismo', rawText: '400m 1:15' }, asCoach)

    const asAthlete = await supabaseAs(fixtures.athlete1)
    await completeSessionLine({ sessionExerciseId: line.id, athleteMembershipId: fixtures.athlete1.membershipId }, asAthlete)

    const alerts = await getAthletesWithoutExecutionSince(fixtures.coachA1.membershipId, '2026-08-25', asCoach)
    expect(alerts.some((a) => a.athleteMembershipId === fixtures.athlete1.membershipId)).toBe(false)
  })

  test('coach2 no ve alertas de atletas que no son suyos', async () => {
    const asCoachA2 = await supabaseAs(fixtures.coachA2)
    const alerts = await getAthletesWithoutExecutionSince(fixtures.coachA2.membershipId, '2020-01-01', asCoachA2)
    expect(alerts.some((a) => a.athleteMembershipId === fixtures.athlete1.membershipId)).toBe(false)
  })

  test('energía baja en el check-in dispara la alerta de seguimiento', async () => {
    const asAthlete2 = await supabaseAs(fixtures.athlete2)
    await submitCheckin(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, date: '2026-09-05', energia: 1 },
      asAthlete2
    )

    const asCoachA2 = await supabaseAs(fixtures.coachA2)
    const alerts = await getWellnessAlerts(fixtures.coachA2.membershipId, '2026-09-05', {}, asCoachA2)
    expect(alerts.some((a) => a.athleteMembershipId === fixtures.athlete2.membershipId && a.energia === 1)).toBe(true)
  })

  test('energía normal NO dispara alerta', async () => {
    const asAthlete2 = await supabaseAs(fixtures.athlete2)
    await submitCheckin(
      { organizationId: fixtures.orgA.id, athleteMembershipId: fixtures.athlete2.membershipId, date: '2026-09-06', energia: 4 },
      asAthlete2
    )

    const asCoachA2 = await supabaseAs(fixtures.coachA2)
    const alerts = await getWellnessAlerts(fixtures.coachA2.membershipId, '2026-09-06', {}, asCoachA2)
    expect(alerts.some((a) => a.athleteMembershipId === fixtures.athlete2.membershipId)).toBe(false)
  })

  test('una competencia asignada a mi atleta dentro del rango aparece en "próximas"', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'competencia',
        title: 'Torneo de prueba',
        date: '2026-09-15',
        assignments: [{ type: 'person', id: fixtures.athlete1.membershipId }],
      },
      asCoach
    )

    const competitions = await getUpcomingCompetitions(fixtures.coachA1.membershipId, '2026-09-01', '2026-09-30', asCoach)
    expect(competitions.some((c) => c.title === 'Torneo de prueba')).toBe(true)
  })

  test('getTodaySummary cuenta asignados vs. completados correctamente', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    const event = await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'entrenamiento',
        title: 'Resumen de hoy test',
        date: '2026-09-10',
        assignments: [
          { type: 'person', id: fixtures.athlete1.membershipId },
          { type: 'person', id: fixtures.athlete2.membershipId },
        ],
      },
      asCoach
    )
    const line = await addSessionLine({ eventId: event.id, sportName: 'Atletismo', rawText: '400m 1:15' }, asCoach)

    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    await completeSessionLine({ sessionExerciseId: line.id, athleteMembershipId: fixtures.athlete1.membershipId }, asAthlete1)
    // athlete2 NO completa

    const summary = await getTodaySummary(fixtures.coachA1.membershipId, '2026-09-10', asCoach)
    expect(summary.assigned).toBe(2)
    expect(summary.completed).toBe(1)
  })
})
