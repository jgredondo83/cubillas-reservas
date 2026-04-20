import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'

interface Contadores {
  usuariosPendientes: number
  reservasHoy: number
  noPresentadosPendientes: number
  pagosPendientes: number
  viviendasImpago: number
}

export default function AdminDashboard() {
  const tema = useTemaAdmin()
  const [contadores, setContadores] = useState<Contadores>({
    usuariosPendientes: 0,
    reservasHoy: 0,
    noPresentadosPendientes: 0,
    pagosPendientes: 0,
    viviendasImpago: 0,
  })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarContadores()
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

  const hoyMadrid = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })

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
      link: '/admin/reservas?estado=pendiente_no_presentado',
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

  return (
    <AdminLayout titulo="Dashboard">
      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <div className={`animate-spin h-8 w-8 border-4 border-gray-200 rounded-full ${tema.acento} border-t-current`} />
        </div>
      ) : (
        <>
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

          <div className="bg-white border border-gray-200 rounded-xl p-6">
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
        </>
      )}
    </AdminLayout>
  )
}
