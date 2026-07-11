import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, type Fixtures } from './setup'

describe('Visibilidad restrictiva de people (coach solo ve sus propios atletas)', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('coachA1 NO puede ver la persona de athlete2, aunque sea de su misma organización', async () => {
    // athlete2 es de orgA (igual que coachA1) pero reporta a coachA2
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const { data } = await asCoachA1.from('people').select('*').eq('id', fixtures.athlete2.personId)
    expect(data).toHaveLength(0)
  })

  test('coachA1 SÍ puede ver la persona de athlete1 (es su atleta)', async () => {
    const asCoachA1 = await supabaseAs(fixtures.coachA1)
    const { data } = await asCoachA1.from('people').select('*').eq('id', fixtures.athlete1.personId)
    expect(data).toHaveLength(1)
  })

  test('manager SÍ ve a todas las personas de su organización, aunque no sean sus atletas directos', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    const { data: sees1 } = await asManager.from('people').select('*').eq('id', fixtures.athlete1.personId)
    const { data: sees2 } = await asManager.from('people').select('*').eq('id', fixtures.athlete2.personId)
    expect(sees1).toHaveLength(1)
    expect(sees2).toHaveLength(1)
  })

  test('un atleta solo se ve a sí mismo, no a otro atleta del mismo coach', async () => {
    const asAthlete1 = await supabaseAs(fixtures.athlete1)
    const { data: ownPerson } = await asAthlete1.from('people').select('*').eq('id', fixtures.athlete1.personId)
    const { data: otherPerson } = await asAthlete1.from('people').select('*').eq('id', fixtures.athlete2.personId)
    expect(ownPerson).toHaveLength(1)
    expect(otherPerson).toHaveLength(0)
  })
})
