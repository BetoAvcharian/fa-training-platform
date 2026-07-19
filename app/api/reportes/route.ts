import { getTodayISO } from '@/lib/today'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getReportData } from '@/domains/reports/queries'

export async function GET(request: NextRequest) {
  const membership = await getMyActiveMembership()
  if (!membership || membership.role === 'athlete') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams

  const rows = await getReportData({
    organizationId: membership.organizationId,
    athleteMembershipId: params.get('atleta') ?? undefined,
    groupId: params.get('grupo') ?? undefined,
    desde: params.get('desde') ?? undefined,
    hasta: params.get('hasta') ?? undefined,
    sourceType: params.get('origen') ?? undefined,
  })

  const sheetData = rows.map((r) => ({
    Fecha: r.date,
    Atleta: r.athleteName,
    Deporte: r.sport,
    Prueba: r.observableName,
    Valor: r.value,
    Unidad: r.unitSymbol ?? '',
    'Puntos WA': r.waPoints ?? '',
    Origen: r.sourceType,
    Estado: r.validationStatus,
  }))

  const worksheet = XLSX.utils.json_to_sheet(sheetData)
  worksheet['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte-${getTodayISO()}.xlsx"`,
    },
  })
}
