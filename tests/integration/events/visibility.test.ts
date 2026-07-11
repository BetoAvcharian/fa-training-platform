import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'
import { createEvent } from '@/domains/events/mutations'

describe('Events — visibilidad por rol y por tipo de asignación', () => {
  let fixtures: Fixtures
  let groupId: string
  let eventForAthlete1Id: string
  let eventForGroupId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()

    const { data: group } = await serviceClient
      .from('groups')
      .insert({ organization_id: fixtures.orgA.id, name: `Grupo test ${Date.now()}` })
      .select('id')
      .single()
    groupId = group!.id

    await serviceClient
      .from('group_memberships')
      .insert({ group_id: groupId, membership_id: fixtures.athlete1.membershipId })

    // Event asignado directo a athlete1 (creado por coachA1, su coach)
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const event1 = await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'entrenamiento',
        title: 'Sesión individual',
        date: '2026-08-10',
        assignments: [{ type: 'person', id: fixtures.athlete1.membershipId }],
      },
      asCoachA1
    )
    eventForAthlete1Id = event1.id

    // Event asignado al grupo (que incluye a athlete1)
    const eventGroup = await createEvent(
      {
        organizationId: fixtures.orgA.id,
        type: 'entrenamiento',
        title: 'Sesión grupal',
        date: '2026-08-11',
        assignments: [{ type: 'group', id: groupId }],
      },
      asCoachA1
    )
    eventForGroupId = eventGroup.id
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('el atleta asignado directamente ve su Event', async () => {
    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    const { data } = await asAthlete1.from('events').select('*').eq('id', eventForAthlete1Id)
    expect(data).toHaveLength(1)
  })

  test('un atleta NO asignado no ve el Event de otro', async () => {
    const asAthlete2 = await supabaseAs(fixtures.athlete2)
    const { data } = await asAthlete2.from('events').select('*').eq('id', eventForAthlete1Id)
    expect(data).toHaveLength(0)
  })

  test('un atleta ve un Event asignado a un GRUPO del que es miembro', async () => {
    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    const { data } = await asAthlete1.from('events').select('*').eq('id', eventForGroupId)
    expect(data).toHaveLength(1)
  })

  test('coachA2 (no es el coach de athlete1, no creó el Event) no lo ve', async () => {
    const asCoachA2 = await supabaseAs(fixtures.coachA2)
    const { data } = await asCoachA2.from('events').select('*').eq('id', eventForAthlete1Id)
    expect(data).toHaveLength(0)
  })

  test('coachA1 (lo creó) sigue viendo su propio Event', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const { data } = await asCoachA1.from('events').select('*').eq('id', eventForAthlete1Id)
    expect(data).toHaveLength(1)
  })

  test('manager ve todos los Events de su organización, sin importar quién los creó', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    const { data: sees1 } = await asManager.from('events').select('*').eq('id', eventForAthlete1Id)
    const { data: sees2 } = await asManager.from('events').select('*').eq('id', eventForGroupId)
    expect(sees1).toHaveLength(1)
    expect(sees2).toHaveLength(1)
  })

  test('un coach de otra organización no ve nada de esto', async () => {
    const asCoachB = await supabaseAs(fixtures.coachB)
    const { data } = await asCoachB.from('events').select('*').eq('id', eventForAthlete1Id)
    expect(data).toHaveLength(0)
  })
})
