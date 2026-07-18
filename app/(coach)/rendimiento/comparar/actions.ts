'use server'

import { redirect } from 'next/navigation'

export async function compareAction(formData: FormData) {
  const observableIds = formData.getAll('observableIds').map(String)
  const groupId = String(formData.get('groupId') ?? '')
  const athleteIds = formData.getAll('athleteIds').map(String)
  const desde = String(formData.get('desde') ?? '')
  const hasta = String(formData.get('hasta') ?? '')
  const soloOficiales = formData.get('soloOficiales') === '1'
  const origenes = formData.getAll('origenes').map(String)

  const params = new URLSearchParams()
  if (observableIds.length > 0) params.set('observableIds', observableIds.join(','))
  if (groupId) params.set('groupId', groupId)
  if (athleteIds.length > 0) params.set('athletes', athleteIds.join(','))
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  if (soloOficiales) params.set('oficiales', '1')
  if (origenes.length > 0) params.set('origenes', origenes.join(','))

  redirect(`/rendimiento/comparar?${params.toString()}`)
}
