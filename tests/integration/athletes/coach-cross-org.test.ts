import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, serviceClient, type Fixtures } from './setup'

describe('Integridad coach↔organización a nivel de Postgres', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('la base rechaza asignar un coach de otra organización, aunque se intente vía SQL directo (bypass total de TypeScript)', async () => {
    // Usa service_role a propósito: esto prueba que la garantía vive en el
    // trigger de Postgres (validate_coach_same_org), no en requireRole()
    // ni en ninguna validación de la capa de dominio — si alguien se
    // saltea todo TypeScript, la base igual protege la integridad.
    const { error } = await serviceClient
      .from('memberships')
      .update({ coach_membership_id: fixtures.coachB.membershipId })
      .eq('id', fixtures.athlete1.membershipId)

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/coach_membership_id debe ser un coach de la misma organización/)
  })

  test('la base rechaza asignar como coach a una membership que no tiene role=coach', async () => {
    const { error } = await serviceClient
      .from('memberships')
      .update({ coach_membership_id: fixtures.athlete2.membershipId }) // es athlete, no coach
      .eq('id', fixtures.athlete1.membershipId)

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/coach_membership_id debe ser un coach de la misma organización/)
  })

  test('asignar un coach real de la MISMA organización sí funciona a nivel de base', async () => {
    const { error } = await serviceClient
      .from('memberships')
      .update({ coach_membership_id: fixtures.coachA2.membershipId })
      .eq('id', fixtures.athlete1.membershipId)

    expect(error).toBeNull()
  })
})
