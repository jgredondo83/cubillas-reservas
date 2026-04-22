import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { fechaISO, formatoFechaLarga } from '../../lib/fechas'
import TarjetaReservaGuarda from '../../components/guarda/TarjetaReservaGuarda'
import type { ReservaGuarda } from '../../components/guarda/TarjetaReservaGuarda'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

export default function GuardaDia() {
  const { fecha: fechaParam } = useParams<{ fecha?: string }>()
  const navigate = useNavigate()
  const { perfil, signOut } = useAuth()

  const hoy = fechaISO(new Date())
  const fecha = fechaParam || hoy
  const esHoy = fecha === hoy

  const [reservas, setReservas] = useState<ReservaGuarda[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarReservas = useCallback(async () => {
    setCargando(true)

    // Rango del día en UTC (aproximado, cubrimos amplio para timezone)
    const diaInicio = new Date(fecha + 'T00:00:00')
    diaInicio.setHours(diaInicio.getHours() - 3) // margen timezone
    const diaFin = new Date(fecha + 'T23:59:59')
    diaFin.setHours(diaFin.getHours() + 3)

    const { data } = await supabase
      .from('reservas')
      .select('*, recursos(nombre, tipo, config), usuarios!reservas_usuario_id_fkey(nombre, apellidos, telefono), viviendas(referencia)')
      .eq('comunidad_id', COMUNIDAD_ID)
      .gte('inicio', diaInicio.toISOString())
      .lte('inicio', diaFin.toISOString())
      .order('inicio', { ascending: true })

    // Filtrar solo las que realmente empiezan en este día (timezone Madrid)
    const reservasFiltradas = (data || []).filter((r) => {
      const inicioLocal = new Date(r.inicio).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      return inicioLocal === fecha
    }) as ReservaGuarda[]

    setReservas(reservasFiltradas)
    setCargando(false)
  }, [fecha])

  useEffect(() => {
    cargarReservas()
  }, [cargarReservas])

  function navDia(offset: number) {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    const nueva = fechaISO(d)
    if (nueva === hoy) {
      navigate('/guarda/hoy')
    } else {
      navigate(`/guarda/dia/${nueva}`)
    }
  }

  const fechaLarga = formatoFechaLarga(new Date(fecha + 'T12:00:00'))

  return (
    <main className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-slate-50 font-bold text-lg">Guarda</p>
            <p className="text-slate-400 text-sm capitalize">{fechaLarga}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/guarda/nueva-reserva"
              className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + Reserva
            </Link>
            <Link
              to="/guarda/manual"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              📖 Manual
            </Link>
            <button
              onClick={signOut}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Navegación de días */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navDia(-1)}
            className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1 transition-colors"
          >
            ← Anterior
          </button>
          {!esHoy && (
            <button
              onClick={() => navigate('/guarda/hoy')}
              className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              Hoy
            </button>
          )}
          {esHoy && (
            <span className="text-sm text-teal-400 font-medium">Hoy</span>
          )}
          <button
            onClick={() => navDia(1)}
            className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-teal-400 rounded-full animate-spin" />
          </div>
        ) : reservas.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <p className="text-slate-400">No hay reservas para este día</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
              {reservas.length} reserva{reservas.length !== 1 ? 's' : ''}
            </p>
            {reservas.map((r) => (
              <TarjetaReservaGuarda
                key={r.id}
                reserva={r}
                onActualizar={cargarReservas}
                nombreGuarda={perfil ? `${perfil.nombre} ${perfil.apellidos}` : undefined}
              />
            ))}
          </>
        )}
      </div>
    </main>
  )
}
