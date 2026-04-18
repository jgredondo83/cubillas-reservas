import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { crearReserva } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { Recurso, FranjaOcupada, RecursoConfig } from '../types/database'
import {
  generarDias,
  generarFranjas,
  fechaISO,
  formatoFechaCorta,
  formatoFechaLarga,
  emojiRecurso,
} from '../lib/fechas'
import type { Franja } from '../lib/fechas'

type Paso = 'recurso' | 'duracion' | 'fecha' | 'franja' | 'confirmar' | 'exito'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

export default function Reservar() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [paso, setPaso] = useState<Paso>('recurso')
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [recursoSeleccionado, setRecursoSeleccionado] = useState<Recurso | null>(null)
  const [duracion, setDuracion] = useState<number>(0)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null)
  const [franjas, setFranjas] = useState<Franja[]>([])
  const [franjaSeleccionada, setFranjaSeleccionada] = useState<Franja | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [textoExito, setTextoExito] = useState<string | null>(null)
  const [cargandoFranjas, setCargandoFranjas] = useState(false)

  // Cargar recursos
  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('recursos')
        .select('*')
        .eq('comunidad_id', COMUNIDAD_ID)
        .eq('activo', true)
        .order('nombre')

      if (data) {
        const filtrados = data.filter((r) => {
          const config = r.config as RecursoConfig
          if (config.solo_admin && perfil && !['admin', 'super_admin'].includes(perfil.rol)) {
            return false
          }
          return true
        }) as Recurso[]
        setRecursos(filtrados)
      }
    }
    cargar()
  }, [perfil])

  // Cargar franjas cuando se elige fecha
  useEffect(() => {
    if (!recursoSeleccionado || !fechaSeleccionada || !duracion) return

    async function cargarFranjas() {
      setCargandoFranjas(true)
      const config = recursoSeleccionado!.config

      // Obtener todos los recursos del mismo espacio para detectar solapamientos
      const { data: recursosEspacio } = await supabase
        .from('recursos')
        .select('id')
        .eq('espacio_id', recursoSeleccionado!.espacio_id)

      const recursoIds = recursosEspacio?.map((r) => r.id) || [recursoSeleccionado!.id]
      const fechaStr = fechaISO(fechaSeleccionada!)

      // Ocupadas (incluye día siguiente para cruces de medianoche)
      const fechaHasta = new Date(fechaSeleccionada!)
      fechaHasta.setDate(fechaHasta.getDate() + 1)

      const { data: ocupadas } = await supabase.rpc('franjas_ocupadas', {
        p_recurso_ids: recursoIds,
        p_fecha_desde: fechaStr,
        p_fecha_hasta: fechaISO(fechaHasta),
      }) as { data: FranjaOcupada[] | null }

      // Bloqueos (columnas inicio/fin son timestamptz tras migración 005)
      const diaInicio = new Date(fechaStr + 'T00:00:00').toISOString()
      const diaFin = new Date(fechaStr + 'T23:59:59').toISOString()

      const { data: bloqueos } = await supabase
        .from('bloqueos')
        .select('inicio, fin, motivo')
        .in('recurso_id', recursoIds)
        .gte('fin', diaInicio)
        .lte('inicio', diaFin)

      // Ventanas horarias: array de {desde, hasta}
      const ventanas = config.horario?.default || [{ desde: '09:00', hasta: '22:00' }]

      const f = generarFranjas(
        fechaSeleccionada!,
        duracion,
        ventanas,
        ocupadas || [],
        (bloqueos || []).map((b) => ({ inicio: b.inicio, fin: b.fin, motivo: b.motivo })),
        config.horario_cruza_medianoche || false,
      )

      setFranjas(f)
      setCargandoFranjas(false)
    }

    cargarFranjas()
  }, [recursoSeleccionado, fechaSeleccionada, duracion])

  const config = recursoSeleccionado?.config
  const duraciones = config?.duraciones_permitidas || []

  function seleccionarRecurso(r: Recurso) {
    setRecursoSeleccionado(r)
    setDuracion(0)
    setFechaSeleccionada(null)
    setFranjaSeleccionada(null)

    const durs = r.config.duraciones_permitidas || []
    if (durs.length === 1) {
      setDuracion(durs[0])
      setPaso('fecha')
    } else {
      setPaso('duracion')
    }
  }

  function seleccionarDuracion(d: number) {
    setDuracion(d)
    setFechaSeleccionada(null)
    setFranjaSeleccionada(null)
    setPaso('fecha')
  }

  function seleccionarFecha(f: Date) {
    setFechaSeleccionada(f)
    setFranjaSeleccionada(null)
    setPaso('franja')
  }

  function seleccionarFranja(f: Franja) {
    if (!f.disponible) return
    setFranjaSeleccionada(f)
    setPaso('confirmar')
  }

  async function confirmar() {
    if (!recursoSeleccionado || !fechaSeleccionada || !franjaSeleccionada) return

    setCargando(true)
    setError(null)

    const { data, error: err } = await crearReserva({
      recurso_id: recursoSeleccionado.id,
      fecha: fechaISO(fechaSeleccionada),
      hora_inicio: franjaSeleccionada.horaInicio,
      duracion_minutos: duracion,
    })

    if (err) {
      setError(err)
      setCargando(false)
      return
    }

    setTextoExito(data?.texto_post_reserva || null)
    setCargando(false)
    setPaso('exito')
  }

  function atras() {
    switch (paso) {
      case 'duracion': setPaso('recurso'); break
      case 'fecha': setPaso(duraciones.length === 1 ? 'recurso' : 'duracion'); break
      case 'franja': setPaso('fecha'); break
      case 'confirmar': setPaso('franja'); break
      default: break
    }
  }

  const dias = config
    ? generarDias(config.antelacion_dias || 7, config.antelacion_minima_dias || 0)
    : []

  // Breadcrumb
  const pasos: { clave: Paso; label: string }[] = [
    { clave: 'recurso', label: 'Recurso' },
    ...(duraciones.length > 1 ? [{ clave: 'duracion' as Paso, label: 'Duración' }] : []),
    { clave: 'fecha', label: 'Fecha' },
    { clave: 'franja', label: 'Hora' },
    { clave: 'confirmar', label: 'Confirmar' },
  ]

  const indicePasoActual = pasos.findIndex((p) => p.clave === paso)

  return (
    <main className="min-h-screen bg-teal-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        {paso !== 'exito' && (
          <div className="mb-6">
            {paso !== 'recurso' && (
              <button onClick={atras} className="text-teal-600 text-sm mb-2 flex items-center gap-1">
                ← Atrás
              </button>
            )}
            {/* Breadcrumb */}
            <div className="flex gap-1 text-xs text-gray-400">
              {pasos.map((p, i) => (
                <span key={p.clave} className={i <= indicePasoActual ? 'text-teal-600 font-medium' : ''}>
                  {p.label}{i < pasos.length - 1 ? ' /' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PASO: Recurso */}
        {paso === 'recurso' && (
          <div>
            <h1 className="text-xl font-bold text-teal-700 mb-4">¿Qué quieres reservar?</h1>
            <div className="space-y-3">
              {recursos.map((r) => (
                <button
                  key={r.id}
                  onClick={() => seleccionarRecurso(r)}
                  className="w-full bg-white rounded-xl shadow-sm border border-teal-100 p-4 text-left hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emojiRecurso(r.tipo)}</span>
                    <div>
                      <p className="font-medium text-gray-800">{r.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {r.config.duraciones_permitidas?.map((d) => `${d} min`).join(' / ')}
                        {r.config.coste_euros ? ` · ${r.config.coste_euros}€` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-6 w-full h-12 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* PASO: Duración */}
        {paso === 'duracion' && recursoSeleccionado && (
          <div>
            <h1 className="text-xl font-bold text-teal-700 mb-4">¿Cuánto tiempo?</h1>
            <div className="space-y-3">
              {duraciones.map((d) => (
                <button
                  key={d}
                  onClick={() => seleccionarDuracion(d)}
                  className="w-full h-14 bg-white rounded-xl shadow-sm border border-teal-100 font-medium text-gray-800 hover:border-teal-300 transition-colors"
                >
                  {d} minutos
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO: Fecha */}
        {paso === 'fecha' && recursoSeleccionado && (
          <div>
            <h1 className="text-xl font-bold text-teal-700 mb-4">¿Qué día?</h1>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {dias.map((d) => (
                <button
                  key={d.toISOString()}
                  onClick={() => seleccionarFecha(d)}
                  className={`flex-shrink-0 snap-start w-20 py-3 rounded-xl border text-center transition-colors ${
                    fechaSeleccionada && fechaISO(d) === fechaISO(fechaSeleccionada)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white border-teal-100 text-gray-700 hover:border-teal-300'
                  }`}
                >
                  <p className="text-xs uppercase">{formatoFechaCorta(d).split(' ')[0]}</p>
                  <p className="text-lg font-bold">{d.getDate()}</p>
                  <p className="text-xs">{formatoFechaCorta(d).split(' ').slice(2).join(' ')}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO: Franja */}
        {paso === 'franja' && fechaSeleccionada && (
          <div>
            <h1 className="text-xl font-bold text-teal-700 mb-1">Elige hora</h1>
            <p className="text-sm text-gray-500 mb-4">{formatoFechaLarga(fechaSeleccionada)}</p>

            {cargandoFranjas ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              </div>
            ) : franjas.length === 0 ? (
              <div className="bg-white rounded-xl border border-teal-100 p-6 text-center">
                <p className="text-gray-500">No hay franjas disponibles este día</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {franjas.map((f) => (
                  <button
                    key={f.horaInicio}
                    onClick={() => seleccionarFranja(f)}
                    disabled={!f.disponible}
                    className={`py-3 px-2 rounded-lg text-sm font-medium border transition-colors ${
                      f.disponible
                        ? franjaSeleccionada?.horaInicio === f.horaInicio
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                        : f.motivo && f.motivo !== 'Ocupada'
                          ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    <span>{f.horaInicio} - {f.horaFin}</span>
                    {!f.disponible && (
                      <span className="block text-xs mt-0.5">{f.motivo || 'Ocupada'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO: Confirmar */}
        {paso === 'confirmar' && recursoSeleccionado && fechaSeleccionada && franjaSeleccionada && (
          <div>
            <h1 className="text-xl font-bold text-teal-700 mb-4">Confirmar reserva</h1>

            <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{emojiRecurso(recursoSeleccionado.tipo)}</span>
                <p className="font-medium text-gray-800">{recursoSeleccionado.nombre}</p>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>📅 {formatoFechaLarga(fechaSeleccionada)}</p>
                <p>🕐 {franjaSeleccionada.horaInicio} - {franjaSeleccionada.horaFin} ({duracion} min)</p>
                {config?.coste_euros != null && config.coste_euros > 0 && (
                  <p>💰 {config.coste_euros}€</p>
                )}
              </div>
            </div>

            {config?.requiere_pago && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg mt-4">
                Esta reserva quedará pendiente de pago. Pasa por administración en los próximos {config.dias_limite_pago || 7} días para confirmarla.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mt-4">
                {error}
              </div>
            )}

            <button
              onClick={confirmar}
              disabled={cargando}
              className="mt-4 w-full h-12 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cargando ? 'Reservando…' : 'Confirmar reserva'}
            </button>
          </div>
        )}

        {/* PASO: Éxito */}
        {paso === 'exito' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-teal-700 mb-2">¡Reserva creada!</h1>

            {recursoSeleccionado && fechaSeleccionada && franjaSeleccionada && (
              <div className="text-sm text-gray-600 mb-4">
                <p>{recursoSeleccionado.nombre}</p>
                <p>{formatoFechaLarga(fechaSeleccionada)}</p>
                <p>{franjaSeleccionada.horaInicio} - {franjaSeleccionada.horaFin}</p>
              </div>
            )}

            {config?.requiere_pago && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg mb-4 text-left">
                Recuerda: esta reserva está pendiente de pago. Pasa por administración para confirmarla.
              </div>
            )}

            {textoExito && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-lg mb-4 text-left">
                {textoExito}
              </div>
            )}

            <div className="space-y-3 mt-6">
              <button
                onClick={() => navigate('/mis-reservas')}
                className="w-full h-12 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                Mis reservas
              </button>
              <button
                onClick={() => {
                  setRecursoSeleccionado(null)
                  setDuracion(0)
                  setFechaSeleccionada(null)
                  setFranjaSeleccionada(null)
                  setError(null)
                  setTextoExito(null)
                  setPaso('recurso')
                }}
                className="w-full h-12 border border-teal-600 text-teal-600 font-medium rounded-lg hover:bg-teal-50 transition-colors"
              >
                Hacer otra reserva
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
