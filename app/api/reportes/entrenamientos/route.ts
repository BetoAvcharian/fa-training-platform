import { getTodayISO } from '@/lib/today'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getPlannedTrainingsReport } from '@/domains/reports/queries'

const STATUS_LABELS: Record<string, string> = {
  completado: 'Completado',
  completado_con_observacion: 'Con observación',
  no_completado: 'No completado',
  'sin cargar': 'Sin cargar',
}

export async function GET(request: NextRequest) {
  const membership = await getMyActiveMembership()
  if (!membership || membership.role === 'athlete') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams

  const rows = await getPlannedTrainingsReport({
    organizationId: membership.organizationId,
    athleteMembershipId: params.get('atleta') ?? undefined,
    groupId: params.get('grupo') ?? undefined,
    desde: params.get('desde') ?? undefined,
    hasta: params.get('hasta') ?? undefined,
  })

  const sheetData = rows.map((r) => ({
    Fecha: r.date,
    Atleta: r.athleteName,
    Entrenamiento: r.title,
    Detalle: r.lines,
    Feedback: STATUS_LABELS[r.feedbackStatus] ?? r.feedbackStatus,
    Notas: r.feedbackNotes,
    'Fatiga (1-10)': r.fatiga ?? '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(sheetData)
  worksheet['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 30 }, { wch: 12 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entrenamientos')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="entrenamientos-${getTodayISO()}.xlsx"`,
    },
  })
}
