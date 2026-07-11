import { createServiceClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { AuditLogInput } from './types'

/**
 * Única función autorizada a escribir en audit_logs.
 *
 * A diferencia del resto del dominio, esta función NO acepta un cliente
 * inyectable: siempre usa service_role, sin excepción. audit_logs no
 * tiene policy de insert para ningún rol de aplicación (ver
 * 003_identity_rls.sql) — si cualquier rol pudiera escribir directo (o si
 * esta función aceptara un cliente arbitrario), un audit log dejaría de
 * ser una prueba confiable de qué pasó realmente. Es intencionalmente la
 * única pieza de la capa de dominio sin inyección de cliente.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('audit_logs').insert({
    organization_id: input.organizationId,
    actor_membership_id: input.actorMembershipId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_state: input.beforeState ?? null,
    after_state: input.afterState ?? null,
    metadata: input.metadata ?? null,
  })

  if (error) {
    throw new DomainError('CONFLICT', `No se pudo registrar auditoría: ${error.message}`)
  }
}
