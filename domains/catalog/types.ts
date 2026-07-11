export type UnitCategory =
  | 'masa'
  | 'tiempo'
  | 'distancia'
  | 'velocidad'
  | 'frecuencia_cardiaca'
  | 'potencia'
  | 'escala'
  | 'temperatura'

export type ConversionType = 'lineal' | 'formula'

export interface Unit {
  id: string
  organizationId: string | null
  name: string
  symbol: string
  category: UnitCategory
  baseUnitId: string | null
  conversionType: ConversionType
  conversionParams: Record<string, unknown>
}

export interface Sport {
  id: string
  organizationId: string | null
  name: string
}

export interface Observable {
  id: string
  organizationId: string | null
  sportId: string
  unitId: string
  name: string
  isPerformance: boolean
  muscleGroup: string | null
  equipment: string | null
  description: string | null
  tags: string[]
  variantOfId: string | null
}

export type ContextDataType = 'numeric' | 'text' | 'boolean' | 'categorical'

export interface ContextKey {
  id: string
  organizationId: string | null
  name: string
  dataType: ContextDataType
  unitId: string | null
  validMin: number | null
  validMax: number | null
  appliesToSportId: string | null
  required: boolean
}

export interface CreateObservableInput {
  organizationId: string
  sportId: string
  unitId: string
  name: string
  isPerformance: boolean
  muscleGroup?: string
  equipment?: string
  description?: string
  tags?: string[]
  variantOfId?: string
}

export interface HideGlobalItemInput {
  organizationId: string
  entityType: 'sport' | 'unit' | 'observable' | 'context_key'
  entityId: string
}
