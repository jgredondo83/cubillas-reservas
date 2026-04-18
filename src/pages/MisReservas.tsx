import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { cancelarReserva } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { Reserva, Recurso } from '../types/database'
import {
  formatoFechaLarga,
  formatoHoraDesdeDate,
  emojiRecurso,
  cruzaMedianoche,
} from '../lib/fechas'

interface ReservaConRecurso extends Reserva {
  recursos: Pick<Recurso, 'nombre' | 'tipo' | 'config'>
}

const BADGE_COLORES: Record<string, string> = {
  confirmada: 'bg-green-100 text-green-700',
  pendiente_pago: 'bg-amber-100 text-amber-700',
  cancelada: 'bg-gray-100 text-gray-500',
  completada: 'bg-blue-100 text-blue-700',
  no_presentado: 'bg-red-100 text-red-700',
}

const BADGE_TEXTO: Record<string, string> = {
  confirmada: 'Confirmada',
  pendiente_pago: 'Pendiente de pago',
  cancelada: 'Cancelada',
  completada: 'Completada',
  no_presentado: 'No presentado',
}

export default function MisReservas() {
  const { user } = useAuth()
  const [reservas, setReservas] = useState<ReservaConRecurso[]>([])
  const [cargando, setCargando] = useState(true)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [modalCancelar, setModalCancelar] = useState<ReservaConRecurso | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null)
  const [mostrarPasadas, setMostrarPasadas] = useState(false)

  async function cargarReservas() {
    if (!user) return

    const { data } = await supabase
      .from('reservas')
      .select('*, recursos(nombre, tipo, config)')
      .eq('usuario_id', user.id)
      .order('inicio', { ascending: true })

    setReservas((data as ReservaConRecurso[] | null) || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarReservas()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const ahora = new Date()

  const proximas = reservas.filter(
    (r) => ['confirmada', 'pendiente_pago'].includes(r.estado) && new Date(r.inicio) >= ahora
  )

  const pasadas = reservas
    .filter((r) => !proximas.includes(r))
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())
    .slice(0, 10)

  async function handleCancelar() {
    if (!modalCancelar) return

    setCancelando(modalCancelar.id)
    setErrorCancelar(null)

    const { error } = await cancelarReserva({
      reserva_id: modalCancelar.id,
      motivo: motivoCancelacion || undefined,
    })

    if (error) {
      setErrorCancelar(error)
      setCancelando(null)
      return
    }

    setModalCancelar(null)
    setMotivoCancelacion('')
    setCancelando(null)
    await cargarReservas()
  }

  function TarjetaReserva({ reserva, mostrarCancelar }: { reserva: ReservaConRecurso; mostrarCancelar: boolean }) {
    const rec = reserva.recursos
    const config = rec.config as unknown as Record<string, unknown>
    const cruza = cruzaMedianoche(reserva.inicio, reserva.fin)

    return (
      <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{emojiRecurso(rec.tipo)}</span>
            <span className="font-medium text-gray-800">{rec.nombre}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORES[reserva.estado]}`}>
            {BADGE_TEXTO[reserva.estado]}
          </span>
        </div>

        <div className="text-sm text-gray-600 space-y-0.5">
          <p>📅 {formatoFechaLarga(reserva.inicio)}</p>
          <p>
            🕐 {formatoHoraDesdeDate(reserva.inicio)} - {formatoHoraDesdeDate(reserva.fin)}
            {cruza && <span className="text-xs text-amber-600 ml-1">(al día siguiente)</span>}
          </p>
        </div>

        {reserva.estado === 'pendiente_pago' && typeof config.dias_limite_pago === 'number' && (
          <p className="text-xs text-amber-600 mt-2">
            Recuerda pagar en admin antes del{' '}
            {formatoFechaLarga(
              new Date(new Date(reserva.created_at).getTime() + config.dias_limite_pago * 86400000)
            )}
          </p>
        )}

        {mostrarCancelar && (
          <button
            onClick={() => setModalCancelar(reserva)}
            className="mt-3 w-full h-10 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Cancelar reserva
          </button>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-teal-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-teal-700">Mis reservas</h1>
          <Link to="/" className="text-sm text-teal-600">← Inicio</Link>
        </div>

        {cargando ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Próximas */}
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Próximas</h2>
            {proximas.length === 0 ? (
              <div className="bg-white rounded-xl border border-teal-100 p-6 text-center mb-6">
                <p className="text-gray-400">No tienes reservas próximas</p>
                <Link
                  to="/reservar"
                  className="inline-block mt-3 text-teal-600 font-medium text-sm underline"
                >
                  Hacer una reserva
                </Link>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {proximas.map((r) => (
                  <TarjetaReserva key={r.id} reserva={r} mostrarCancelar />
                ))}
              </div>
            )}

            {/* Pasadas */}
            {pasadas.length > 0 && (
              <>
                <button
                  onClick={() => setMostrarPasadas(!mostrarPasadas)}
                  className="text-sm text-gray-500 mb-3 flex items-center gap-1"
                >
                  <span>{mostrarPasadas ? '▼' : '▶'}</span>
                  Pasadas y canceladas ({pasadas.length})
                </button>

                {mostrarPasadas && (
                  <div className="space-y-3 mb-6">
                    {pasadas.map((r) => (
                      <TarjetaReserva key={r.id} reserva={r} mostrarCancelar={false} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <Link
          to="/reservar"
          className="block w-full h-12 bg-teal-600 text-white font-medium rounded-lg text-center leading-[3rem] hover:bg-teal-700 transition-colors"
        >
          Nueva reserva
        </Link>
      </div>

      {/* Modal cancelar */}
      {modalCancelar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-800 mb-2">¿Cancelar reserva?</h2>
            <p className="text-sm text-gray-500 mb-4">
              {modalCancelar.recursos.nombre} — {formatoHoraDesdeDate(modalCancelar.inicio)} del{' '}
              {formatoFechaLarga(modalCancelar.inicio)}
            </p>

            <textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Motivo (opcional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none mb-3"
            />

            {errorCancelar && (
              <p className="text-sm text-red-600 mb-3">{errorCancelar}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setModalCancelar(null); setMotivoCancelacion(''); setErrorCancelar(null) }}
                className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                No, volver
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelando === modalCancelar.id}
                className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelando === modalCancelar.id ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
