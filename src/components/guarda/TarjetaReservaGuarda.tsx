import { useState } from 'react'
import { marcarAsistencia, cancelarReserva } from '../../lib/api'
import { formatoHoraDesdeDate, formatoFechaLarga, cruzaMedianoche, emojiRecurso } from '../../lib/fechas'
import TooltipBoton from '../ui/TooltipBoton'

interface Recurso {
  nombre: string
  tipo: string
  config: Record<string, unknown>
}

interface Usuario {
  nombre: string
  apellidos: string
  telefono: string
}

interface Vivienda {
  referencia: string
}

export interface ReservaGuarda {
  id: string
  inicio: string
  fin: string
  estado: string
  estado_previo: string | null
  marcado_presentado_por: string | null
  marcado_en: string | null
  cancelado_por: string | null
  cancelado_en: string | null
  motivo_cancelacion: string | null
  notas: string | null
  recursos: Recurso
  usuarios: Usuario
  viviendas: Vivienda
}

interface Props {
  reserva: ReservaGuarda
  onActualizar: () => void
  nombreGuarda?: string
}

const VENTANA_ANTES_MS = 60 * 60 * 1000   // 60 min
const VENTANA_DESPUES_MS = 2 * 60 * 60 * 1000 // 2h

export default function TarjetaReservaGuarda({ reserva, onActualizar }: Props) {
  const [cargando, setCargando] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const ahoraMs = Date.now()
  const inicioMs = new Date(reserva.inicio).getTime()
  const finMs = new Date(reserva.fin).getTime()
  const cruza = cruzaMedianoche(reserva.inicio, reserva.fin)

  // Ventana visual: [−60min inicio, fin+2h] para atenuación de tarjeta
  const enVentanaVisual = ahoraMs >= inicioMs - VENTANA_ANTES_MS && ahoraMs <= finMs + VENTANA_DESPUES_MS
  // No presentado: habilitado desde 60 min antes del inicio en adelante (sin límite posterior)
  const yaEnVentana = ahoraMs >= inicioMs - VENTANA_ANTES_MS
  const esEnFuturo = !yaEnVentana

  const esCancelada = reserva.estado === 'cancelada'
  const esMarcada = ['completada', 'no_presentado', 'pendiente_no_presentado'].includes(reserva.estado)
  const esActiva = ['confirmada', 'pendiente_pago'].includes(reserva.estado)

  // Presentado: siempre habilitado si esActiva
  // No presentado: habilitado si yaEnVentana
  // Cancelar: siempre habilitado si esActiva
  const mostrarBotones = esActiva || reserva.estado === 'pendiente_no_presentado'

  // Apariencia: atenuada si fuera de ventana visual
  const fueraDeVentana = esActiva && !enVentanaVisual

  async function handleMarcar(resultado: 'presentado' | 'no_presentado' | 'deshacer') {
    setCargando(true)
    setErrorAccion(null)
    const { error } = await marcarAsistencia({ reserva_id: reserva.id, resultado })
    if (error) {
      setErrorAccion(error)
      setCargando(false)
      return
    }
    setCargando(false)
    onActualizar()
  }

  async function handleCancelar() {
    if (!motivoCancelacion.trim()) {
      setErrorAccion('El motivo es obligatorio')
      return
    }
    setCargando(true)
    setErrorAccion(null)
    const { error } = await cancelarReserva({ reserva_id: reserva.id, motivo: motivoCancelacion })
    if (error) {
      setErrorAccion(error)
      setCargando(false)
      return
    }
    setCargando(false)
    setModalCancelar(false)
    setMotivoCancelacion('')
    onActualizar()
  }

  // Estilos según estado y ventana
  let cardClasses = 'rounded-xl p-4 mb-3 border '
  if (esCancelada) {
    cardClasses += 'bg-slate-800/50 border-slate-700 opacity-40'
  } else if (reserva.estado === 'completada') {
    cardClasses += 'bg-slate-700 border-teal-500/50'
  } else if (reserva.estado === 'no_presentado') {
    cardClasses += 'bg-slate-700 border-red-500/50'
  } else if (reserva.estado === 'pendiente_no_presentado') {
    cardClasses += 'bg-slate-700 border-amber-500/50'
  } else if (fueraDeVentana) {
    cardClasses += 'bg-slate-700 border-slate-600 opacity-60'
  } else {
    cardClasses += 'bg-slate-700 border-slate-600'
  }

  const estadoBadge: Record<string, { texto: string; clase: string }> = {
    confirmada: { texto: 'Confirmada', clase: 'bg-teal-600 text-white' },
    pendiente_pago: { texto: 'Pte. pago', clase: 'bg-amber-600 text-white' },
    completada: { texto: 'Presentado', clase: 'bg-teal-500 text-white' },
    no_presentado: { texto: 'No presentado', clase: 'bg-red-500 text-white' },
    pendiente_no_presentado: { texto: 'Pte. revisar', clase: 'bg-amber-500 text-white' },
    cancelada: { texto: 'Cancelada', clase: 'bg-slate-600 text-slate-300' },
  }

  const badge = estadoBadge[reserva.estado] || { texto: reserva.estado, clase: 'bg-slate-600 text-white' }

  return (
    <>
      <div className={cardClasses}>
        {/* Hora grande */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xl font-bold text-slate-50">
              {formatoHoraDesdeDate(reserva.inicio)} – {formatoHoraDesdeDate(reserva.fin)}
              {cruza && <span className="text-xs text-amber-400 ml-2">(al día siguiente)</span>}
            </p>
            <p className="text-sm text-slate-300 flex items-center gap-1">
              {emojiRecurso(reserva.recursos.tipo)} {reserva.recursos.nombre}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.clase}`}>
            {badge.texto}
          </span>
        </div>

        {/* Vecino */}
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-100">
            {reserva.usuarios.nombre} {reserva.usuarios.apellidos} · {reserva.viviendas.referencia}
          </p>
          <a
            href={`tel:${reserva.usuarios.telefono}`}
            className="text-xs text-slate-400 hover:text-teal-400 transition-colors"
          >
            {reserva.usuarios.telefono}
          </a>
        </div>

        {/* Info de marcado */}
        {esMarcada && reserva.marcado_en && (
          <p className="text-xs text-slate-400 mb-2">
            Marcado el {formatoFechaLarga(reserva.marcado_en)} a las {formatoHoraDesdeDate(reserva.marcado_en)}
          </p>
        )}

        {/* Info de cancelación */}
        {esCancelada && (
          <p className="text-xs text-slate-400 mb-2">
            Cancelada{reserva.cancelado_en ? ` el ${formatoFechaLarga(reserva.cancelado_en)}` : ''}
            {reserva.motivo_cancelacion ? ` — ${reserva.motivo_cancelacion}` : ''}
          </p>
        )}

        {/* Error */}
        {errorAccion && (
          <p className="text-xs text-red-400 mb-2">{errorAccion}</p>
        )}

        {/* Botones para reservas activas / pendiente_no_presentado */}
        {mostrarBotones && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleMarcar('presentado')}
                disabled={cargando}
                className="flex-1 h-14 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                ✓ Se presentó
              </button>
              <TooltipBoton
                texto="Disponible desde 60 min antes del inicio"
                visible={!yaEnVentana}
                className="flex-1"
              >
                <button
                  onClick={() => handleMarcar('no_presentado')}
                  disabled={cargando || !yaEnVentana}
                  className={`w-full h-14 font-medium rounded-lg transition-colors text-sm ${
                    yaEnVentana
                      ? 'bg-red-600 hover:bg-red-500 text-white disabled:opacity-50'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  ✗ No se presentó
                </button>
              </TooltipBoton>
            </div>
            <button
              onClick={() => setModalCancelar(true)}
              disabled={cargando}
              className="w-full h-10 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar reserva
            </button>
          </div>
        )}

        {/* Botón deshacer si ya está marcada */}
        {esMarcada && (
          <button
            onClick={() => handleMarcar('deshacer')}
            disabled={cargando}
            className="w-full h-12 border border-slate-500 text-slate-300 hover:bg-slate-600 font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            Deshacer marca
          </button>
        )}
      </div>

      {/* Modal cancelar */}
      {modalCancelar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-sm p-6 border border-slate-700">
            <h2 className="font-bold text-slate-100 mb-2">¿Cancelar esta reserva?</h2>
            <p className="text-sm text-slate-400 mb-4">
              Vas a cancelar la reserva de {reserva.usuarios.nombre} {reserva.usuarios.apellidos}. Esta acción quedará registrada a tu nombre como vigilante.
            </p>

            {esEnFuturo && (
              <div className="bg-amber-900/50 border border-amber-700 text-amber-200 text-sm p-3 rounded-lg mb-3">
                Esta reserva aún no ha empezado. Cancelarla liberará la franja inmediatamente.
              </div>
            )}

            <textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Motivo de la cancelación (obligatorio)"
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none mb-3"
            />

            {errorAccion && (
              <p className="text-sm text-red-400 mb-3">{errorAccion}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setModalCancelar(false); setMotivoCancelacion(''); setErrorAccion(null) }}
                className="flex-1 h-10 border border-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
              >
                No, volver
              </button>
              <button
                onClick={handleCancelar}
                disabled={cargando}
                className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {cargando ? 'Cancelando…' : 'Sí, cancelar reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
