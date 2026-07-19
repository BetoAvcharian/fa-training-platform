import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'

/**
 * Puntaje World Athletics — cálculo automático real, no manual.
 *
 * Fórmula: puntos = a·marca² + b·marca + c, con coeficientes por
 * prueba/género derivados por regresión cuadrática de la tabla
 * oficial 2025 (fuente MIT: github.com/jchen1/iaaf-scoring-tables —
 * no copia la tabla protegida, ajusta una curva a partir de ella).
 * Verificado contra el ejemplo real del autor: 100m en 10.71s da
 * exactamente 974 puntos.
 *
 * Cubre pista/saltos/lanzamientos estándar. Si no hay coeficiente
 * cargado para esa prueba (ej. ejercicios de gimnasio como
 * sentadilla/peso muerto, que no son pruebas de World Athletics),
 * devuelve null sin romper nada — el resultado se guarda igual, sin
 * puntaje.
 */
export async function calculateWaPoints(
  observableId: string,
  gender: string | null,
  value: number,
  client?: AppSupabaseClient
): Promise<number | null> {
  if (!gender || (gender !== 'masculino' && gender !== 'femenino')) return null

  const supabase = client ?? (await createServerClient())
  const { data } = await supabase
    .from('wa_score_coefficients')
    .select('coef_a, coef_b, coef_c')
    .eq('observable_id', observableId)
    .eq('gender', gender)
    .maybeSingle()

  if (!data) return null

  const points = data.coef_a * value * value + data.coef_b * value + data.coef_c
  const rounded = Math.round(points)
  // Las curvas se degradan feo en marcas muy alejadas del rango real
  // (ej. una sentadilla mal cargada como si fuera segundos) — un
  // resultado fuera de rango humano no es un puntaje real.
  if (!Number.isFinite(rounded) || rounded < 0 || rounded > 1400) return null
  return rounded
}
