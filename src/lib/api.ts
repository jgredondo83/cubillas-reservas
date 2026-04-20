import { supabase } from './supabase'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

async function callFunction<T>(nombre: string, body: unknown): Promise<{ data?: T; error?: string; errorData?: Record<string, unknown> }> {
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
    return { error: json.error || 'Error desconocido', errorData: json }
  }

  return { data: json as T }
}

export interface CrearReservaParams {
  recurso_id: string
  fecha: string
  hora_inicio: string
  duracion_minutos: number
  usuario_id?: string
  forzar?: boolean
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

export interface MarcarAsistenciaParams {
  reserva_id: string
  resultado: 'presentado' | 'no_presentado' | 'deshacer'
  nota?: string
}

export interface MarcarAsistenciaResult {
  estado: string
  accion: string
  contador?: number
  bloqueado?: boolean
}

export function marcarAsistencia(params: MarcarAsistenciaParams) {
  return callFunction<MarcarAsistenciaResult>('marcar-asistencia', params)
}

// === Admin ===

export interface CrearUsuarioAdminParams {
  nombre: string
  apellidos: string
  alias?: string
  telefono: string
  email?: string
  vivienda_id: string
  rol?: string
  activar_cuenta?: boolean
}

export function crearUsuarioAdmin(params: CrearUsuarioAdminParams) {
  return callFunction<{ usuario: Record<string, unknown> }>('crear-usuario-admin', params)
}

export interface GestionarUsuarioParams {
  usuario_id: string
  accion: 'verificar' | 'bloquear' | 'desbloquear' | 'cambiar_rol' | 'eliminar' | 'cambiar_email'
  motivo?: string
  nuevo_rol?: string
  nuevo_email?: string
  bloqueado_hasta?: string | null
}

export function gestionarUsuario(params: GestionarUsuarioParams) {
  return callFunction<{ accion: string }>('gestionar-usuario-admin', params)
}

export interface GestionarViviendaParams {
  vivienda_id: string
  accion: 'bloquear' | 'desbloquear' | 'eliminar'
  motivo?: string
}

export interface CrearViviendaParams {
  referencia: string
  bloque?: string
  numero?: string
  letra?: string
  planta?: string
  nota_admin?: string
}

export function crearVivienda(params: CrearViviendaParams) {
  return callFunction<{ vivienda: Record<string, unknown> }>('gestionar-vivienda-admin', { accion: 'crear', ...params })
}

export function gestionarVivienda(params: GestionarViviendaParams) {
  return callFunction<{ accion: string }>('gestionar-vivienda-admin', params)
}

export interface RegistrarPagoParams {
  reserva_id: string
  cantidad_euros: number
  fianza_euros?: number
  metodo: 'efectivo' | 'bizum' | 'transferencia' | 'otros'
  referencia?: string
}

export function registrarPago(params: RegistrarPagoParams) {
  return callFunction<{ estado: string; datos_pago: Record<string, unknown> }>('registrar-pago', params)
}
