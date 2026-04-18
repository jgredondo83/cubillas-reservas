import { supabase } from './supabase'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

async function callFunction<T>(nombre: string, body: unknown): Promise<{ data?: T; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const res = await fetch(`${FUNCTIONS_URL}/${nombre}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()

  if (!res.ok) {
    return { error: json.error || 'Error desconocido' }
  }

  return { data: json as T }
}

export interface CrearReservaParams {
  recurso_id: string
  fecha: string
  hora_inicio: string
  duracion_minutos: number
}

export interface CrearReservaResult {
  reserva: Record<string, unknown>
  texto_post_reserva: string | null
}

export function crearReserva(params: CrearReservaParams) {
  return callFunction<CrearReservaResult>('crear-reserva', params)
}

export interface CancelarReservaParams {
  reserva_id: string
  motivo?: string
}

export function cancelarReserva(params: CancelarReservaParams) {
  return callFunction<{ fue_tardia: boolean }>('cancelar-reserva', params)
}
