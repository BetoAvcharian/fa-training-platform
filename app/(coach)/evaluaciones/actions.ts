'use server'

import { revalidatePath } from 'next/cache'
import { createProtocol, createAssessment, deleteProtocol } from '@/domains/assessments/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createProtocolAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const name = String(formData.get('name') ?? '')
  const observableIds = formData.getAll('observableIds').map(String)

  if (!name.trim()) return { error: 'Falta el nombre' }
  if (observableIds.length === 0) return { error: 'Elegí al menos una prueba' }

  try {
    await createProtocol({ organizationId: membership.organizationId, name, observableIds })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo crear' }
  }

  revalidatePath('/evaluaciones')
  return { error: null }
}

export async function createAssessmentAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const athleteMembershipId = String(formData.get('athleteMembershipId') ?? '')
  const title = String(formData.get('title') ?? '')
  const date = String(formData.get('date') ?? '')
  const protocolId = String(formData.get('protocolId') ?? '') || undefined
  const notes = String(formData.get('notes') ?? '')

  const observableIds = formData.getAll('observableId').map(String)
  const values = formData.getAll('value').map(String)

  const results = observableIds
    .map((observableId, i) => ({ observableId, value: Number(values[i]) }))
    .filter((r) => r.observableId && values[observableIds.indexOf(r.observableId)] !== '' && !Number.isNaN(r.value))

  if (!athleteMembershipId || !title.trim()) return { error: 'Faltan datos' }

  try {
    await createAssessment({
      organizationId: membership.organizationId,
      athleteMembershipId,
      protocolId,
      title,
      date: date || undefined,
      notes: notes || undefined,
      results,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/evaluaciones')
  return { error: null }
}

export async function deleteProtocolAction(protocolId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await deleteProtocol({ protocolId, organizationId: membership.organizationId })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo eliminar' }
  }

  revalidatePath('/evaluaciones')
  return { error: null }
}
