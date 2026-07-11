import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'

describe('Catálogo — visibilidad global + por organización', () => {
  let fixtures: Fixtures
  let orgAOnlySportId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const { data } = await serviceClient
      .from('sports')
      .insert({ organization_id: fixtures.orgA.id, name: `Deporte propio de A ${Date.now()}` })
      .select('id')
      .single()
    orgAOnlySportId = data!.id
  })

  afterAll(async () => {
    await serviceClient.from('sports').delete().eq('id', orgAOnlySportId)
    await teardownFixtures(fixtures)
  })

  test('una organización nueva ya ve el catálogo global sin crear nada (seed)', async () => {
    const asManagerA = await supabaseAs(fixtures.managerA)
    const { data } = await asManagerA.from('sports').select('*').is('organization_id', null)
    expect(data!.length).toBeGreaterThanOrEqual(2) // Atletismo + Fuerza como mínimo
    expect(data!.some((s) => s.name === 'Atletismo')).toBe(true)
  })

  test('un ítem propio de Org A es invisible para Org B', async () => {
    const asCoachB = await supabaseAs(fixtures.coachB)
    const { data } = await asCoachB.from('sports').select('*').eq('id', orgAOnlySportId)
    expect(data).toHaveLength(0)
  })

  test('el mismo ítem propio de Org A SÍ es visible dentro de Org A', async () => {
    const asManagerA = await supabaseAs(fixtures.managerA)
    const { data } = await asManagerA.from('sports').select('*').eq('id', orgAOnlySportId)
    expect(data).toHaveLength(1)
  })

  test('el catálogo global es visible para AMBAS organizaciones por igual', async () => {
    const asManagerA = await supabaseAs(fixtures.managerA)
    const asCoachB = await supabaseAs(fixtures.coachB)

    const { data: seenByA } = await asManagerA.from('sports').select('*').eq('name', 'Atletismo')
    const { data: seenByB } = await asCoachB.from('sports').select('*').eq('name', 'Atletismo')

    expect(seenByA).toHaveLength(1)
    expect(seenByB).toHaveLength(1)
    expect(seenByA![0].id).toBe(seenByB![0].id) // es LA MISMA fila, no una copia
  })
})
