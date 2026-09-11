'use server'

import { redirect } from 'next/navigation'
import { signUpManager, signUpCoach, signUpAthlete } from '@/domains/athletes/mutations'
import { getCoachesForJoinCode } from '@/domains/athletes/queries'
import type { CoachDirectoryEntry } from '@/domains/athletes/types'
import { DomainError } from '@/types/errors'

function readCommon(formData: FormData) {
  return {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
  }
}

export async function signUpManagerAction(formData: FormData) {
  const common = readCommon(formData)
  const organizationName = String(formData.get('organizationName') ?? '')

  try {
    await signUpManager({ ...common, organizationName })
  } catch (e) {
    const message = e instanceof DomainError ? e.message : 'No se pudo crear la cuenta'
    redirect(`/signup?role=manager&error=${encodeURIComponent(message)}`)
  }
  redirect('/')
}

export async function signUpCoachAction(formData: FormData) {
  const common = readCommon(formData)
  const joinCode = String(formData.get('joinCode') ?? '')

  try {
    await signUpCoach({ ...common, joinCode })
  } catch (e) {
    const message = e instanceof DomainError ? e.message : 'No se pudo crear la cuenta'
    redirect(`/signup?role=coach&error=${encodeURIComponent(message)}`)
  }
  redirect('/')
}

export async function signUpAthleteAction(formData: FormData) {
  const common = readCommon(formData)
  const coachMembershipId = String(formData.get('coachMembershipId') ?? '')
  const birthDate = String(formData.get('birthDate') ?? '')
  const gender = String(formData.get('gender') ?? '')
  const phone = String(formData.get('phone') ?? '')
  const club = String(formData.get('club') ?? '')

  try {
    await signUpAthlete({ ...common, coachMembershipId, birthDate, gender, phone, club })
  } catch (e) {
    const message = e instanceof DomainError ? e.message : 'No se pudo crear la cuenta'
    redirect(`/signup?role=athlete&error=${encodeURIComponent(message)}`)
  }
  redirect('/')
}

export async function lookupCoachesByJoinCodeAction(joinCode: string): Promise<CoachDirectoryEntry[]> {
  if (!joinCode || joinCode.trim().length < 4) return []
  try {
    return await getCoachesForJoinCode(joinCode)
  } catch {
    return []
  }
}
