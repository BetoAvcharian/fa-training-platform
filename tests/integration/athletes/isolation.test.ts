import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, type Fixtures } from './setup'

describe('Aislamiento multi-tenant', () => {
  let fixtures: Fixtures

  beforeAll(async () => {
    fixtures = await seedFixtures()
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('un manager de Org A no puede leer memberships de Org B', async () => {
    const client = await supabaseAs(fixtures.managerA)
    const { data } = await client.from('memberships').select('*').eq('organization_id', fixtures.orgB.id)
    expect(data).toHaveLength(0)
  })

  test('un coach de Org B no puede leer memberships de Org A', async () => {
    const client = await supabaseAs(fixtures.coachB)
    const { data } = await client.from('memberships').select('*').eq('organization_id', fixtures.orgA.id)
    expect(data).toHaveLength(0)
  })

  test('un manager de Org A no puede leer la fila de Organization B', async () => {
    const client = await supabaseAs(fixtures.managerA)
    const { data } = await client.from('organizations').select('*').eq('id', fixtures.orgB.id)
    expect(data).toHaveLength(0)
  })

  test('un manager SÍ lee su propia organización', async () => {
    const client = await supabaseAs(fixtures.managerA)
    const { data } = await client.from('organizations').select('*').eq('id', fixtures.orgA.id)
    expect(data).toHaveLength(1)
  })
})
