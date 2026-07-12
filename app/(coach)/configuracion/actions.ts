'use server'

import { revalidatePath } from 'next/cache'
import { createGroup } from '@/domains/athletes/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createGroupAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const name = String(formData.get('name') ?? '')
  if (!name.trim()) return { error: 'Falta el nombre' }

  try {
    await createGroup({ organizationId: membership.organizationId, name })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/configuracion')
  return { error: null }
}
