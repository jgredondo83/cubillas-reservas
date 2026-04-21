import type { SupabaseClient } from '@supabase/supabase-js'

export interface OcupacionRecurso {
  id: string
  nombre: string
  tipo: string
  reservas: number
  horas_reservadas: number
  pct_ocupacion: number | null
}

export interface EstadisticasDashboard {
  total_reservas_mes: number
  total_completadas: number
  total_no_presentado: number
  pct_asistencia: number | null
  recurso_top: { nombre: string; count: number } | null
  vecino_top: { nombre: string; count: number } | null
  vecinos_con_reservas_mes: number
  ocupacion_recursos: OcupacionRecurso[]
}

// Convierte "HH:mm" a minutos desde medianoche.
// "00:00" se trata como 1440 (fin de día).
function parseMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + (m || 0)
  return total === 0 ? 1440 : total
}

/**
 * Calcula las horas abiertas por día sumando todas las ventanas del horario default.
 * Devuelve null si no hay franjas definidas (recursos solo_admin u horario vacío).
 */
export function calcularHorasAbiertasPorDia(
  config: Record<string, unknown>
): number | null {
  const horario = config?.horario as
    | { default?: Array<{ desde: string; hasta: string }> }
    | undefined
  const franjas = horario?.default
  if (!franjas || franjas.length === 0) return null

  let totalMinutos = 0
  for (const f of franjas) {
    const desde = parseMinutos(f.desde)
    const hasta = parseMinutos(f.hasta)
    // "00:00" en `hasta` ya se convirtió a 1440; "00:00" en `desde` sería raro, ignorar
    if (hasta > desde) {
      totalMinutos += hasta - desde
    }
  }

  return totalMinutos > 0 ? totalMinutos / 60 : null
}

/**
 * Calcula el porcentaje de ocupación de un recurso.
 * Devuelve null si no se pueden calcular las horas disponibles.
 */
export function calcularPctOcupacion(
  horasReservadas: number,
  horasAbiertasPorDia: number | null,
  diasTranscurridos: number
): number | null {
  if (!horasAbiertasPorDia || diasTranscurridos <= 0) return null
  const horasDisponibles = horasAbiertasPorDia * diasTranscurridos
  if (horasDisponibles <= 0) return null
  return Math.round((horasReservadas / horasDisponibles) * 1000) / 10
}

/**
 * Llama a la RPC estadisticas_dashboard_admin y devuelve los datos del mes en curso.
 * Lanza excepción si falla (el caller debe manejarla).
 */
export async function getEstadisticasDashboard(
  supabase: SupabaseClient,
  comunidadId: string
): Promise<EstadisticasDashboard> {
  const { data, error } = await supabase.rpc('estadisticas_dashboard_admin', {
    com_id: comunidadId,
  })

  if (error || !data) {
    throw new Error(error?.message ?? 'Sin datos de estadísticas')
  }

  return data as EstadisticasDashboard
}
