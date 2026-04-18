export type RolUsuario = 'super_admin' | 'admin' | 'guarda' | 'vecino' | 'lectura'

export type EstadoUsuario = 'pendiente' | 'activo' | 'inactivo' | 'bloqueado'

export type NivelPadel =
  | 'iniciacion'
  | 'basico'
  | 'intermedio'
  | 'intermedio_alto'
  | 'avanzado'

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
  bloqueada_por_impago: boolean
  motivo_bloqueo: string | null
}

export interface Usuario {
  id: string
  comunidad_id: string
  vivienda_id: string
  nombre: string
  apellidos: string
  alias: string | null
  telefono: string | null
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
  tipo: 'padel' | 'tenis' | 'club_social'
  activo: boolean
  config: Record<string, unknown>
}
