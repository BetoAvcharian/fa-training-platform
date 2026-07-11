export type DomainErrorCode = 'VALIDATION' | 'PERMISSION' | 'NOT_FOUND' | 'CONFLICT'

/**
 * Único tipo de error que lanza la capa de dominio (Fase 11). Ninguna
 * función de /domains/*/mutations.ts lanza un Error genérico ni un string
 * — así la UI siempre sabe cómo mostrar el fallo sin adivinar por texto.
 */
export class DomainError extends Error {
  code: DomainErrorCode
  field?: string

  constructor(code: DomainErrorCode, message: string, field?: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.field = field
  }
}
