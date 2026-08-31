'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getMyActiveMemberships } from '@/domains/athletes/queries'

export async function chooseProfileAction(formData: FormData) {
  const membershipId = String(formData.get('membershipId') ?? '')

  // Confirmar que ese perfil realmente es de la persona logueada antes de
  // guardarlo — no confiar ciegamente en lo que mandó el form.
  const options = await getMyActiveMemberships()
  const valid = options.some((o) => o.id === membershipId)
  if (!valid) redirect('/elegir-perfil?error=1')

  const cookieStore = await cookies()
  cookieStore.set('active_membership_id', membershipId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  })

  redirect('/')
}

export async function switchProfileAction() {
  const cookieStore = await cookies()
  cookieStore.delete('active_membership_id')
  redirect('/elegir-perfil')
}
