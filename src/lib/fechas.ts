const formateadorFechaCorta = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const formateadorFechaLarga = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const formateadorHora = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatoFechaCorta(fecha: Date | string | null | undefined): string {
  if (!fecha) return '—'
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return formateadorFechaCorta.format(d)
}

export function formatoFechaLarga(fecha: Date | string | null | undefined): string {
  if (!fecha) return '—'
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return formateadorFechaLarga.format(d)
}

export function formatoHora(hora: string): string {
  return hora.slice(0, 5)
}

export function formatoHoraDesdeDate(fecha: Date | string | null | undefined): string {
  if (!fecha) return '—'
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return formateadorHora.format(d)
}

/** Fecha en formato YYYY-MM-DD (local) */
export function fechaISO(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Genera lista de fechas desde hoy+offset hasta hoy+dias */
export function generarDias(dias: number, offsetMinimo: number = 0): Date[] {
  const resultado: Date[] = []
  const hoy = new Date()
  for (let i = offsetMinimo; i <= dias; i++) {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() + i)
    d.setHours(0, 0, 0, 0)
    resultado.push(d)
  }
  return resultado
}

/** Devuelve true si la fecha es hoy */
export function esHoy(fecha: Date): boolean {
  const hoy = new Date()
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  )
}

export interface Franja {
  horaInicio: string // HH:mm
  horaFin: string // HH:mm
  inicio: Date
  fin: Date
  disponible: boolean
  motivo?: string
}

export interface VentanaHorarioInput {
  desde: string // HH:mm
  hasta: string // HH:mm
}

/**
 * Genera franjas disponibles para un recurso en una fecha.
 * Itera sobre las ventanas horarias (array de {desde, hasta}).
 * Paso entre franjas: 30 min.
 * Para hoy, excluye franjas cuya hora_inicio sea < now() + 60min.
 */
export function generarFranjas(
  fecha: Date,
  duracionMinutos: number,
  ventanas: VentanaHorarioInput[],
  ocupadas: { inicio: string; fin: string }[],
  bloqueos: { inicio: string; fin: string; motivo: string }[],
  horarioCruzaMedianoche: boolean = false,
  margenHoyMs: number = 0, // ocultar solo franjas ya pasadas; la EF valida el resto
): Franja[] {
  const franjas: Franja[] = []
  const paso = 30 // minutos

  const ahora = new Date()
  const limiteHoy = new Date(ahora.getTime() + margenHoyMs)

  for (const ventana of ventanas) {
    const [hIni, mIni] = ventana.desde.split(':').map(Number)
    const [hFin, mFin] = ventana.hasta.split(':').map(Number)

    const inicioMinutos = hIni * 60 + mIni
    // "00:00" como hasta = medianoche = 1440 minutos (fin del día)
    let finMinutos = (hFin === 0 && mFin === 0) ? 1440 : hFin * 60 + mFin
    // Si cruza medianoche y fin aún <= inicio, sumar 24h
    if (horarioCruzaMedianoche && finMinutos <= inicioMinutos) {
      finMinutos += 24 * 60
    }

    // Sin cruce medianoche: última franja de inicio = hasta - duracion
    // Con cruce medianoche: hora de inicio puede llegar hasta 'hasta' (fin se calcula sumando duracion)
    const limiteInicio = horarioCruzaMedianoche ? finMinutos : finMinutos - duracionMinutos

    for (let m = inicioMinutos; m <= limiteInicio && (horarioCruzaMedianoche || m + duracionMinutos <= finMinutos); m += paso) {
      const hI = Math.floor(m / 60) % 24
      const mI = m % 60
      const horaInicio = `${String(hI).padStart(2, '0')}:${String(mI).padStart(2, '0')}`

      const totalFin = m + duracionMinutos
      const hF = Math.floor(totalFin / 60) % 24
      const mF = totalFin % 60
      const horaFin = `${String(hF).padStart(2, '0')}:${String(mF).padStart(2, '0')}`

      // Crear timestamps reales
      const inicio = new Date(fecha)
      inicio.setHours(hI, mI, 0, 0)

      const fin = new Date(fecha)
      if (totalFin >= 24 * 60) {
        fin.setDate(fin.getDate() + 1)
      }
      fin.setHours(hF, mF, 0, 0)

      // Excluir franjas pasadas (para hoy, margen de 60 min)
      if (esHoy(fecha) && inicio < limiteHoy) {
        continue
      }

      // Comprobar solapamiento con ocupadas
      const solapaOcupada = ocupadas.some((o) => {
        const oInicio = new Date(o.inicio)
        const oFin = new Date(o.fin)
        return inicio < oFin && fin > oInicio
      })

      // Comprobar solapamiento con bloqueos
      const bloqueo = bloqueos.find((b) => {
        const bInicio = new Date(b.inicio)
        const bFin = new Date(b.fin)
        return inicio < bFin && fin > bInicio
      })

      if (bloqueo) {
        franjas.push({ horaInicio, horaFin, inicio, fin, disponible: false, motivo: bloqueo.motivo })
      } else if (solapaOcupada) {
        franjas.push({ horaInicio, horaFin, inicio, fin, disponible: false, motivo: 'Ocupada' })
      } else {
        franjas.push({ horaInicio, horaFin, inicio, fin, disponible: true })
      }
    }
  }

  return franjas
}

/** Emoji por tipo de recurso */
export function emojiRecurso(tipo: string): string {
  switch (tipo) {
    case 'padel': return '🏸'
    case 'tenis': return '🎾'
    case 'club_social': return '🏠'
    default: return '📍'
  }
}

/** Indica si una reserva cruza medianoche */
export function cruzaMedianoche(inicio: string, fin: string): boolean {
  const dInicio = new Date(inicio)
  const dFin = new Date(fin)
  return dFin.getDate() !== dInicio.getDate() ||
         dFin.getMonth() !== dInicio.getMonth() ||
         dFin.getFullYear() !== dInicio.getFullYear()
}
