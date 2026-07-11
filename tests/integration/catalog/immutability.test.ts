import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { seedFixtures, teardownFixtures, supabaseAs, serviceClient, type Fixtures } from '../athletes/setup'

describe('Catálogo — inmutabilidad de lo global', () => {
  let fixtures: Fixtures
  let globalSportId: string

  beforeAll(async () => {
    fixtures = await seedFixtures()
    const { data } = await serviceClient.from('sports').select('id').eq('name', 'Atletismo').single()
    globalSportId = data!.id
  })

  afterAll(async () => {
    await teardownFixtures(fixtures)
  })

  test('un manager NO puede modificar un Sport global, aunque sea manager de una organización real', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    const { error, data } = await asManager
      .from('sports')
      .update({ name: 'Atletismo Hackeado' })
      .eq('id', globalSportId)
      .select()

    // RLS silenciosamente no afecta ninguna fila (no lanza excepción,
    // pero tampoco actualiza nada) — se confirma verificando que el
    // nombre siga intacto, no solo mirando el resultado de la operación.
    expect(data).toHaveLength(0)

    const { data: stillIntact } = await serviceClient.from('sports').select('name').eq('id', globalSportId).single()
    expect(stillIntact!.name).toBe('Atletismo')
  })

  test('un manager NO puede insertar una fila global (organization_id null), aunque lo intente explícitamente', async () => {
    const asManager = await supabaseAs(fixtures.managerA)
    const { error } = await asManager.from('sports').insert({ organization_id: null, name: 'Intento global' })
    expect(error).not.toBeNull()
  })

  test('un coach SÍ puede insertar un Sport propio de su organización', async () => {
    const asCoach = await supabaseAs(fixtures.coachA1)
    const { error, data } = await asCoach
      .from('sports')
      .insert({ organization_id: fixtures.orgA.id, name: `Deporte de prueba coach ${Date.now()}` })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data).not.toBeNull()

    await serviceClient.from('sports').delete().eq('id', data!.id) // limpieza
  })

  test('un athlete no puede insertar ni siquiera dentro de su propia organización', async () => {
    const asAthlete = await supabaseAs(fixtures.athlete1)
    const { error } = await asAthlete
      .from('sports')
      .insert({ organization_id: fixtures.orgA.id, name: 'Intento de atleta' })
    expect(error).not.toBeNull()
  })
})
