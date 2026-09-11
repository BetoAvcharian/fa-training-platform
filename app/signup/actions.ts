'use server'

import { redirect } from 'next/navigation'
import { signUpManager, signUpCoach, signUpAthlete } from '@/domains/athletes/mutations'
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

  try {
    await signUpAthlete({ ...common, coachMembershipId })
  } catch (e) {
    const message = e instanceof DomainError ? e.message : 'No se pudo crear la cuenta'
    redirect(`/signup?role=athlete&error=${encodeURIComponent(message)}`)
  }
  redirect('/')
}
