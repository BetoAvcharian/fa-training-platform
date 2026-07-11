import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from './setup'
import { inviteMember, reassignAthleteCoach } from '@/domains/athletes/mutations'

describe('AuditLog', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('invitar un miembro deja fila en audit_logs con actor y metadata correctos', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    const result = await inviteMember(
      {
        organizationId: fixtures.orgA.id,
        email: 'auditado@test.entrename.dev',
        role: 'athlete',
        coachMembershipId: fixtures.coachA1.membershipId,
      },
      asManager
    )

    const { data: logs } = await serviceClient
      .from('audit_logs')
      .select('*')
      .eq('entity_id', result.id)
      .eq('action', 'membership.invite')

    expect(logs).toHaveLength(1)
    expect(logs![0].actor_membership_id).toBe(fixtures.managerA.membershipId)
    expect(logs![0].metadata).toMatchObject({ role: 'athlete' })
  })

  test('reasignar coach deja before_state y after_state coherentes', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    await reassignAthleteCoach(
      {
        athleteMembershipId: fixtures.athlete1.membershipId,
        newCoachMembershipId: fixtures.coachA2.membershipId,
      },
      asManager
    )

    const { data: logs } = await serviceClient
      .from('audit_logs')
      .select('*')
      .eq('entity_id', fixtures.athlete1.membershipId)
      .eq('action', 'membership.reassign_coach')

    expect(logs).toHaveLength(1)
    expect(logs![0].before_state).toMatchObject({ coach_membership_id: fixtures.coachA1.membershipId })
    expect(logs![0].after_state).toMatchObject({ coach_membership_id: fixtures.coachA2.membershipId })
  })

  test('un coach no puede leer audit_logs de otra organización', async () => {
    const asCoachB = await supabaseAs(fixtures.coachB)
    const { data } = await asCoachB.from('audit_logs').select('*').eq('organization_id', fixtures.orgA.id)
    expect(data).toHaveLength(0)
  })

  test('un athlete no puede leer audit_logs, ni siquiera de su propia organización', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const { data } = await asAthlete.from('audit_logs').select('*').eq('organization_id', fixtures.orgA.id)
    expect(data).toHaveLength(0)
  })

  test('ningún rol de aplicación puede insertar directo en audit_logs (sin policy de insert)', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    const { error } = await asManager.from('audit_logs').insert({
      organization_id: fixtures.orgA.id,
      actor_membership_id: fixtures.managerA.membershipId,
      action: 'membership.invite',
      entity_type: 'membership',
      entity_id: fixtures.athlete1.membershipId,
    })
    expect(error).not.toBeNull()
  })
})
