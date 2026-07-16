import { getTodayISO } from '@/lib/today'
import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { logAudit } from '@/domains/audit/mutations'

export async function createProtocol(
  input: { organizationId: string; name: string; observableIds: string[] },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { data, error } = await supabase
    .from('protocols')
    .insert({ organization_id: input.organizationId, name: input.name })
    .select('id')
    .single()

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear el protocolo')

  if (input.observableIds.length > 0) {
    await supabase.from('protocol_observables').insert(
      input.observableIds.map((observableId, i) => ({ protocol_id: data.id, observable_id: observableId, order_index: i }))
    )
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'protocol.create',
    entityType: 'protocol',
    entityId: data.id,
    metadata: { name: input.name },
  })

  return { id: data.id }
}

export async function createAssessment(
  input: {
    organizationId: string
    athleteMembershipId: string
    protocolId?: string
    title: string
    date?: string
    notes?: string
    results: Array<{ observableId: string; value: number }>
  },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const date = input.date ?? getTodayISO()

  const { data: assessment, error } = await supabase
    .from('assessments')
    .insert({
      organization_id: input.organizationId,
      athlete_membership_id: input.athleteMembershipId,
      protocol_id: input.protocolId ?? null,
      title: input.title,
      date,
      notes: input.notes ?? null,
      created_by_membership_id: actor.id,
    })
    .select('id')
    .single()

  if (error || !assessment) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear la evaluación')

  // Cada resultado es una Observation con source_type='assessment' y
  // assessment_id como source_ref (spec 3.5: el Assessment es solo el
  // header, cada variable medida vive como Observation propia). Sin
  // contexto que insertar atómicamente acá, un insert directo alcanza
  // — el trigger de récord (deferred) igual corre normal.
  if (input.results.length > 0) {
    const { error: obsError } = await supabase.from('observations').insert(
      input.results.map((r) => ({
        organization_id: input.organizationId,
        athlete_membership_id: input.athleteMembershipId,
        observable_id: r.observableId,
        value: r.value,
        date,
        source_type: 'assessment',
        assessment_id: assessment.id,
        state: 'ejecutado',
        validation_status: 'verificado',
        created_by_membership_id: actor.id,
      }))
    )
    if (obsError) throw new DomainError('CONFLICT', obsError.message)
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'assessment.create',
    entityType: 'assessment',
    entityId: assessment.id,
    metadata: { title: input.title, resultCount: input.results.length },
  })

  return { id: assessment.id }
}

export async function deleteProtocol(
  input: { protocolId: string; organizationId: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { error } = await supabase
    .from('protocols')
    .delete()
    .eq('id', input.protocolId)
    .eq('organization_id', input.organizationId)

  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'protocol.delete',
    entityType: 'protocol',
    entityId: input.protocolId,
  })
}
