export type RolUsuario = 'super_admin' | 'admin' | 'guarda' | 'vecino' | 'lectura'

export type EstadoUsuario = 'pendiente' | 'activo' | 'inactivo' | 'bloqueado'

export type NivelPadel =
  | 'iniciacion'
  | 'basico'
  | 'intermedio'
  | 'intermedio_alto'
  | 'avanzado'

export type TipoRecurso = 'padel' | 'tenis' | 'club_social'

export type EstadoReserva =
  | 'confirmada'
  | 'pendiente_pago'
  | 'pagado'
  | 'cancelada'
  | 'completada'
  | 'no_presentado'
  | 'pendiente_no_presentado'

export interface VentanaHorario {
  desde: string // HH:mm
  hasta: string // HH:mm
}

export interface RecursoConfig {
  duraciones_permitidas: number[]
  horario: {
    default: VentanaHorario[]
    [dia: string]: VentanaHorario[]
  }
  antelacion_dias: number
  antelacion_minima_dias?: number
  max_reservas_activas_por_vivienda?: number
  minutos_para_cancelar_sin_penalizacion?: number
  coste_euros?: number
  fianza_euros?: number
  requiere_pago?: boolean
  dias_limite_pago?: number
  solo_admin?: boolean
  horario_cruza_medianoche?: boolean
  texto_post_reserva_clave?: string
  comparte_espacio_con_tipo?: string
  variante?: string
}

export interface Comunidad {
  id: string
  nombre: string
  slug: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Vivienda {
  id: string
  comunidad_id: string
  referencia: string
  bloque: string | null
  numero: string | null
  letra: string | null
  planta: string | null
  bloqueada_por_impago: boolean
  motivo_bloqueo: string | null
  nota_admin: string | null
}

export interface Usuario {
  id: string
  comunidad_id: string
  vivienda_id: string
  nombre: string
  apellidos: string
  alias: string | null
  telefono: string
  rol: RolUsuario
  estado: EstadoUsuario
  nivel_padel_autoevaluado: NivelPadel | null
  puntos_ranking: number
  bloqueado_hasta: string | null
  no_presentado_count_30d: number
  consentimiento_privacidad_en: string | null
  consentimiento_privacidad_ip: string | null
  created_at: string
  updated_at: string
}

export interface Recurso {
  id: string
  comunidad_id: string
  nombre: string
  tipo: TipoRecurso
  activo: boolean
  espacio_id: string
  config: RecursoConfig
}

export interface Reserva {
  id: string
  comunidad_id: string
  recurso_id: string
  usuario_id: string
  vivienda_id: string
  espacio_id: string
  inicio: string
  fin: string
  estado: EstadoReserva
  cancelado_en: string | null
  cancelado_por: string | null
  motivo_cancelacion: string | null
  cancelo_tarde: boolean
  notas: string | null
  datos_pago: {
    cantidad_euros: number
    fianza_euros?: number
    metodo: 'efectivo' | 'bizum' | 'transferencia' | 'otros'
    referencia?: string
    registrado_por: string
    registrado_en: string
  } | null
  estado_previo: string | null
  marcado_presentado_por: string | null
  marcado_en: string | null
  creado_por: string
  creado_en: string
  updated_at: string
}

export interface Bloqueo {
  id: string
  recurso_id: string
  inicio: string
  fin: string
  motivo: string
  creado_por: string
  created_at: string
}

export interface TextoAdmin {
  id: string
  comunidad_id: string
  clave: string
  contenido: string
  updated_at: string
}

export interface FranjaOcupada {
  recurso_id: string
  inicio: string
  fin: string
  estado: string
}
