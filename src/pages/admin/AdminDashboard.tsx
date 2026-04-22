import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import {
  getEstadisticasDashboard,
  calcularHorasAbiertasPorDia,
  calcularPctOcupacion,
} from '../../lib/estadisticas'
import type { EstadisticasDashboard, OcupacionRecurso } from '../../lib/estadisticas'
import type { RecursoConfig } from '../../types/database'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

interface Contadores {
  usuariosPendientes: number
  reservasHoy: number
  noPresentadosPendientes: number
  pagosPendientes: number
  viviendasImpago: number
}

export default function AdminDashboard() {
  const tema = useTemaAdmin()

  // Contadores rápidos (tarjetas superiores)
  const [contadores, setContadores] = useState<Contadores>({
    usuariosPendientes: 0,
    reservasHoy: 0,
    noPresentadosPendientes: 0,
    pagosPendientes: 0,
    viviendasImpago: 0,
  })
  const [cargando, setCargando] = useState(true)

  // Estadísticas del mes
  const [stats, setStats] = useState<EstadisticasDashboard | null>(null)
  const [ocupacion, setOcupacion] = useState<OcupacionRecurso[]>([])
  const [cargandoStats, setCargandoStats] = useState(true)
  const [errorStats, setErrorStats] = useState(false)
  const [avisoActivo, setAvisoActivo] = useState<{ id: string; titulo: string; tipo: string } | null>(null)

  useEffect(() => {
    cargarContadores()
    cargarEstadisticas()
    supabase
      .from('avisos')
      .select('id, titulo, tipo')
      .eq('activo', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAvisoActivo(data ?? null))
  }, [])

  async function cargarContadores() {
    setCargando(true)
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString()

    const [rPendientes, rReservasHoy, rNoPresentados, rPagosPend, rImpago] = await Promise.all([
      supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('reservas').select('id', { count: 'exact', head: true })
        .gte('inicio', inicioHoy).lt('inicio', finHoy)
        .in('estado', ['confirmada', 'pendiente_pago', 'pagado']),
      supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente_no_presentado'),
      supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente_pago'),
      supabase.from('viviendas').select('id', { count: 'exact', head: true }).eq('bloqueada_por_impago', true),
    ])

    setContadores({
      usuariosPendientes: rPendientes.count ?? 0,
      reservasHoy: rReservasHoy.count ?? 0,
      noPresentadosPendientes: rNoPresentados.count ?? 0,
      pagosPendientes: rPagosPend.count ?? 0,
      viviendasImpago: rImpago.count ?? 0,
    })
    setCargando(false)
  }

  async function cargarEstadisticas() {
    setCargandoStats(true)
    setErrorStats(false)
    try {
      // Cargar estadísticas y configs de recursos en paralelo
      const [statsData, recursosData] = await Promise.all([
        getEstadisticasDashboard(supabase, COMUNIDAD_ID),
        supabase.from('recursos').select('id, config').eq('comunidad_id', COMUNIDAD_ID),
      ])

      // Calcular días transcurridos del mes en curso (incluye hoy)
      const diasTranscurridos = new Date().getDate()

      // Construir mapa config por recurso_id
      const configMap: Record<string, RecursoConfig> = {}
      for (const r of recursosData.data ?? []) {
        configMap[r.id] = r.config as RecursoConfig
      }

      // Enriquecer ocupacion_recursos con pct_ocupacion calculado en frontend
      const ocupacionEnriquecida: OcupacionRecurso[] = statsData.ocupacion_recursos.map((r) => {
        const cfg = configMap[r.id]
        const horasPorDia = cfg
          ? calcularHorasAbiertasPorDia(cfg as unknown as Record<string, unknown>)
          : null
        return {
          ...r,
          pct_ocupacion: calcularPctOcupacion(r.horas_reservadas, horasPorDia, diasTranscurridos),
        }
      })

      setStats(statsData)
      setOcupacion(ocupacionEnriquecida)
    } catch {
      setErrorStats(true)
    } finally {
      setCargandoStats(false)
    }
  }

  const hoyMadrid = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
  const nombreMes = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const tarjetas = [
    {
      titulo: 'Usuarios pendientes',
      valor: contadores.usuariosPendientes,
      icono: '👥',
      color: 'bg-amber-50 border-amber-200',
      textoColor: 'text-amber-700',
      link: '/admin/usuarios?estado=pendiente',
    },
    {
      titulo: 'Reservas hoy',
      valor: contadores.reservasHoy,
      icono: '📅',
      color: 'bg-blue-50 border-blue-200',
      textoColor: 'text-blue-700',
      link: `/admin/reservas?fecha=${hoyMadrid}`,
    },
    {
      titulo: 'No presentados (pte. revisar)',
      valor: contadores.noPresentadosPendientes,
      icono: '⚠️',
      color: 'bg-red-50 border-red-200',
      textoColor: 'text-red-700',
      link: '/admin/no-presentados',
    },
    {
      titulo: 'Pagos pendientes',
      valor: contadores.pagosPendientes,
      icono: '💰',
      color: 'bg-amber-50 border-amber-200',
      textoColor: 'text-amber-700',
      link: '/admin/reservas?estado=pendiente_pago',
    },
    {
      titulo: 'Viviendas con impago',
      valor: contadores.viviendasImpago,
      icono: '🏠',
      color: 'bg-orange-50 border-orange-200',
      textoColor: 'text-orange-700',
      link: '/admin/viviendas?impago=true',
    },
  ]

  function textoVecinoTop(): string {
    if (!stats) return '—'
    if (!stats.vecino_top) return 'Sin datos'
    if (stats.vecinos_con_reservas_mes <= 2) return 'Sin datos suficientes'
    return `${stats.vecino_top.nombre} (${stats.vecino_top.count})`
  }

  return (
    <AdminLayout titulo="Dashboard">
      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <div className={`animate-spin h-8 w-8 border-4 border-gray-200 rounded-full ${tema.acento} border-t-current`} />
        </div>
      ) : (
        <>
          {/* Tarjetas de estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {tarjetas.map((t) => (
              <Link
                key={t.titulo}
                to={t.link}
                className={`${t.color} border rounded-xl p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.icono}</span>
                  <div>
                    <p className={`text-2xl font-bold ${t.textoColor}`}>{t.valor}</p>
                    <p className="text-sm text-gray-600">{t.titulo}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Indicador aviso activo */}
          <Link
            to="/admin/avisos"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-4 border text-sm transition-colors hover:opacity-90 ${
              avisoActivo
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            <span>{avisoActivo ? '📢' : '🔕'}</span>
            <span className="flex-1">
              {avisoActivo
                ? <>Aviso activo: <strong>{avisoActivo.titulo}</strong></>
                : 'Sin avisos activos ahora mismo'}
            </span>
            <span className="text-xs opacity-60">Gestionar →</span>
          </Link>

          {/* Accesos rápidos */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <h2 className="font-bold text-gray-800 mb-3">Accesos rápidos</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/usuarios"
                className={`px-4 py-2 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
              >
                Gestionar usuarios
              </Link>
              <Link
                to="/admin/viviendas"
                className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Ver viviendas
              </Link>
              <Link
                to="/admin/reservas"
                className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Ver reservas
              </Link>
            </div>
          </div>

          {/* Estadísticas del mes en curso */}
          <section>
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="font-bold text-gray-800">Estadísticas del mes en curso</h2>
              <p className="text-sm text-gray-400 capitalize">Datos de {nombreMes} hasta hoy.</p>
            </div>

            {cargandoStats ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-500" />
              </div>
            ) : errorStats ? (
              <p className="text-sm text-gray-400 py-4">
                No se han podido cargar las estadísticas. Inténtalo más tarde.
              </p>
            ) : (
              <>
                {/* 4 tarjetas métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Total reservas */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-800">
                      {stats?.total_reservas_mes ?? '—'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Total reservas este mes</p>
                  </div>

                  {/* Asistencia */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-800">
                      {stats?.pct_asistencia != null
                        ? `${stats.pct_asistencia}%`
                        : 'Sin datos aún'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Asistencia</p>
                    {stats?.pct_asistencia != null && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {stats.total_completadas} present. / {stats.total_no_presentado} no present.
                      </p>
                    )}
                  </div>

                  {/* Recurso top */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-lg font-bold text-gray-800 leading-tight">
                      {stats?.recurso_top
                        ? `${stats.recurso_top.nombre}`
                        : 'Sin datos'}
                    </p>
                    {stats?.recurso_top && (
                      <p className="text-sm text-gray-400 mt-0.5">{stats.recurso_top.count} reservas</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">Recurso top del mes</p>
                  </div>

                  {/* Vecino top */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-base font-bold text-gray-800 leading-tight">
                      {textoVecinoTop()}
                    </p>
                    {stats?.vecino_top && stats.vecinos_con_reservas_mes > 2 && (
                      <p className="text-sm text-gray-400 mt-0.5">{stats.vecino_top.count} reservas</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">Vecino top del mes</p>
                  </div>
                </div>

                {/* Tabla ocupación por recurso */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-medium text-gray-800 text-sm">Ocupación por recurso</h3>
                  </div>
                  {ocupacion.length === 0 ? (
                    <p className="text-sm text-gray-400 p-4">Sin reservas este mes.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Recurso</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-600">Reservas</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-600 hidden sm:table-cell">Horas reserv.</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-600">% ocupación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ocupacion.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-800">{r.nombre}</td>
                              <td className="px-4 py-2 text-right text-gray-700 font-medium">{r.reservas}</td>
                              <td className="px-4 py-2 text-right text-gray-500 hidden sm:table-cell">{r.horas_reservadas}h</td>
                              <td className="px-4 py-2 text-right">
                                {r.pct_ocupacion != null ? (
                                  <span className={`font-medium ${r.pct_ocupacion >= 70 ? 'text-red-600' : r.pct_ocupacion >= 40 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {r.pct_ocupacion}%
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  )
}
