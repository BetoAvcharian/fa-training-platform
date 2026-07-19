import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'

export interface Protocol {
  id: string
  name: string
  organizationId: string | null
}

export interface ProtocolObservable {
  observableId: string
  observableName: string
  unitSymbol: string | null
}

export interface Assessment {
  id: string
  title: string
  date: string
  notes: string | null
  athleteMembershipId: string
  athleteName: string
  protocolName: string | null
}

export interface AssessmentResult {
  id: string
  observableName: string
  unitSymbol: string | null
  value: number
  waPoints: number | null
}

export async function getProtocols(organizationId: string, client?: AppSupabaseClient): Promise<Protocol[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('protocols')
    .select('id, name, organization_id')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order('name')

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, organizationId: row.organization_id }))
}

export async function getProtocolObservables(protocolId: string, client?: AppSupabaseClient): Promise<ProtocolObservable[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('protocol_observables')
    .select('observable_id, order_index, observables(name, units(symbol))')
    .eq('protocol_id', protocolId)
    .order('order_index')

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    observableId: row.observable_id,
    observableName: row.observables?.name ?? '—',
    unitSymbol: row.observables?.units?.symbol ?? null,
  }))
}

/** Evaluaciones de la organización (o filtradas a un atleta puntual). RLS resuelve visibilidad. */
export async function getAssessments(
  organizationId: string,
  athleteMembershipId?: string,
  client?: AppSupabaseClient
): Promise<Assessment[]> {
  const supabase = client ?? (await createServerClient())
  let query = supabase
    .from('assessments')
    .select('id, title, date, notes, athlete_membership_id, memberships!assessments_athlete_membership_id_fkey(people(first_name, last_name)), protocols(name)')
    .eq('organization_id', organizationId)
    .order('date', { ascending: false })

  if (athleteMembershipId) query = query.eq('athlete_membership_id', athleteMembershipId)

  const { data, error } = await query
  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    notes: row.notes,
    athleteMembershipId: row.athlete_membership_id,
    athleteName: row.memberships?.people ? `${row.memberships.people.first_name} ${row.memberships.people.last_name}` : '—',
    protocolName: row.protocols?.name ?? null,
  }))
}

export async function getAssessmentResults(assessmentId: string, client?: AppSupabaseClient): Promise<AssessmentResult[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('observations')
    .select('id, value, wa_points, observables(name, units(symbol))')
    .eq('assessment_id', assessmentId)
    .is('superseded_by', null)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    observableName: row.observables?.name ?? '—',
    unitSymbol: row.observables?.units?.symbol ?? null,
    value: row.value,
    waPoints: row.wa_points,
  }))
}
