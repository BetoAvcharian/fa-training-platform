'use server'

import { revalidatePath } from 'next/cache'
import { updateMyProfile } from '@/domains/athletes/mutations'
import { DomainError } from '@/types/errors'

export async function updateProfileAction(formData: FormData) {
  try {
    await updateMyProfile({
      birthDate: String(formData.get('birthDate') ?? ''),
      gender: String(formData.get('gender') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      club: String(formData.get('club') ?? ''),
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/perfil')
  return { error: null }
}

export async function updatePhotoAction(photoUrl: string) {
  try {
    await updateMyProfile({ photoUrl })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar la foto' }
  }

  revalidatePath('/perfil')
  return { error: null }
}
