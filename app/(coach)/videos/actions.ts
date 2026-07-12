'use server'

import { revalidatePath } from 'next/cache'
import { createVideo, deleteVideo } from '@/domains/videos/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createVideoAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const title = String(formData.get('title') ?? '')
  const description = String(formData.get('description') ?? '')
  const sourceType = String(formData.get('sourceType') ?? '')
  const url = String(formData.get('url') ?? '')

  if (!title.trim()) return { error: 'Falta el título' }
  if (!url.trim()) return { error: 'Falta la URL' }
  if (sourceType !== 'upload' && sourceType !== 'link') return { error: 'Tipo inválido' }

  try {
    await createVideo({
      organizationId: membership.organizationId,
      title,
      description: description || undefined,
      sourceType,
      url,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/videos')
  return { error: null }
}

export async function deleteVideoAction(id: string, storagePath?: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await deleteVideo({ id, organizationId: membership.organizationId, storagePath })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo borrar' }
  }

  revalidatePath('/videos')
  return { error: null }
}
