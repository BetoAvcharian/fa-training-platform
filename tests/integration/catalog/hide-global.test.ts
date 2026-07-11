import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'
import { hideGlobalItem } from '@/domains/catalog/mutations'
import { getSports } from '@/domains/catalog/queries'
import { DomainError } from '@/types/errors'

describe('Catálogo — ocultar (no modificar) ítems globales', () => {
  let fixtures: Fixtures
  let globalSportId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const { data } = await serviceClient.from('sports').select('id').eq('name', 'Fuerza').single()
    globalSportId = data!.id
  })

  afterAll(async () => {
    await serviceClient
      .from('catalog_visibility_overrides')
      .delete()
      .eq('organization_id', fixtures.orgA.id)
      .eq('entity_id', globalSportId)
    await teardownFixtures(fixtures)
  })

  test('manager puede ocultar un Sport global para su organización', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    await hideGlobalItem(
      { organizationId: fixtures.orgA.id, entityType: 'sport', entityId: globalSportId },
      asManager
    )

    const sportsForA = await getSports(fixtures.orgA.id, asManager)
    expect(sportsForA.some((s) => s.id === globalSportId)).toBe(false)
  })

  test('ocultarlo para Org A NO afecta a Org B — sigue viéndolo normal', async () => {
    const asCoachB = await supabaseAs(fixtures.coachB)
    const sportsForB = await getSports(fixtures.orgB.id, asCoachB)
    expect(sportsForB.some((s) => s.id === globalSportId)).toBe(true)
  })

  test('ocultarlo no modifica la fila global en sí — sigue existiendo intacta', async () => {
    const { data } = await serviceClient.from('sports').select('name').eq('id', globalSportId).single()
    expect(data!.name).toBe('Fuerza')
  })

  test('un coach NO puede ocultar ítems globales (acción exclusiva de manager)', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    await expect(
      hideGlobalItem({ organizationId: fixtures.orgA.id, entityType: 'sport', entityId: globalSportId }, asCoach)
    ).rejects.toBeInstanceOf(DomainError)
  })
})
