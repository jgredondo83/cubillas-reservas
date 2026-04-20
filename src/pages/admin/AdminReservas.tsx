import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import BadgeEstado from '../../components/admin/BadgeEstado'
import DropdownAcciones from '../../components/admin/DropdownAcciones'
import ModalConfirmacion from '../../components/admin/ModalConfirmacion'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import { cancelarReserva, marcarAsistencia } from '../../lib/api'
import type { EstadoReserva } from '../../types/database'

interface ReservaAdmin {
  id: string
  inicio: string
  fin: string
  estado: EstadoReserva
  notas: string | null
  motivo_cancelacion: string | null
  usuario_id: string
  usuario_nombre: string
  usuario_apellidos: string
  recurso_nombre: string
  vivienda_id: string
  vivienda_ref: string
}

const PAGE_SIZE = 20

export default function AdminReservas() {
  const tema = useTemaAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [reservas, setReservas] = useState<ReservaAdmin[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<EstadoReserva | ''>(
    (searchParams.get('estado') as EstadoReserva) || ''
  )
  const [filtroFecha, setFiltroFecha] = useState(searchParams.get('fecha') || searchParams.get('dia') || '')
  const [pagina, setPagina] = useState(0)

  // Modal
  const [reservaAccion, setReservaAccion] = useState<ReservaAdmin | null>(null)
  const [accionTipo, setAccionTipo] = useState<'cancelar' | 'presentado' | 'no_presentado' | 'deshacer' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  useEffect(() => {
    cargar()
  }, [pagina, filtroEstado, filtroFecha])

  async function cargar() {
    setCargando(true)
    let query = supabase
      .from('reservas')
      .select(
        'id, inicio, fin, estado, notas, motivo_cancelacion, usuario_id, vivienda_id, usuarios!reservas_usuario_id_fkey(nombre, apellidos), recursos(nombre), viviendas(referencia)',
        { count: 'exact' }
      )

    if (filtroEstado) query = query.eq('estado', filtroEstado)
    if (filtroFecha) {
      const inicio = `${filtroFecha}T00:00:00`
      const fin = `${filtroFecha}T23:59:59`
      query = query.gte('inicio', inicio).lte('inicio', fin)
    }

    query = query
      .order('inicio', { ascending: false })
      .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1)

    const { data, count } = await query

    setReservas(
      (data || []).map((r: Record<string, unknown>) => {
        const usuario = r.usuarios as { nombre: string; apellidos: string } | null
        const recurso = r.recursos as { nombre: string } | null
        const vivienda = r.viviendas as { referencia: string } | null
        return {
          id: r.id as string,
          inicio: r.inicio as string,
          fin: r.fin as string,
          estado: r.estado as EstadoReserva,
          notas: r.notas as string | null,
          motivo_cancelacion: r.motivo_cancelacion as string | null,
          usuario_id: r.usuario_id as string,
          usuario_nombre: usuario?.nombre || '—',
          usuario_apellidos: usuario?.apellidos || '',
          recurso_nombre: recurso?.nombre || '—',
          vivienda_id: r.vivienda_id as string,
          vivienda_ref: vivienda?.referencia || '—',
        }
      })
    )
    setTotal(count ?? 0)
    setCargando(false)
  }

  function aplicarFiltros() {
    setPagina(0)
    const params: Record<string, string> = {}
    if (filtroEstado) params.estado = filtroEstado
    if (filtroFecha) params.fecha = filtroFecha
    setSearchParams(params)
  }

  async function ejecutarAccion(motivo?: string) {
    if (!reservaAccion || !accionTipo) return
    setProcesando(true)
    setError(null)

    let err: string | undefined

    if (accionTipo === 'cancelar') {
      const result = await cancelarReserva({ reserva_id: reservaAccion.id, motivo })
      err = result.error
    } else {
      const result = await marcarAsistencia({
        reserva_id: reservaAccion.id,
        resultado: accionTipo === 'deshacer' ? 'deshacer' : accionTipo,
      })
      err = result.error
    }

    if (err) {
      setError(err)
    } else {
      setExito('Acción ejecutada')
      cargar()
      setTimeout(() => setExito(null), 3000)
    }

    setReservaAccion(null)
    setAccionTipo(null)
    setProcesando(false)
  }

  function formatFecha(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  function formatHora(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  function accionesReserva(r: ReservaAdmin) {
    const activa = ['confirmada', 'pendiente_pago'].includes(r.estado)
    const marcada = ['completada', 'no_presentado', 'pendiente_no_presentado'].includes(r.estado)
    return [
      {
        label: 'Cancelar',
        onClick: () => { setReservaAccion(r); setAccionTipo('cancelar') },
        destructivo: true,
        oculto: !activa,
      },
      {
        label: 'Marcar presentado',
        onClick: () => { setReservaAccion(r); setAccionTipo('presentado') },
        oculto: !activa && r.estado !== 'pendiente_no_presentado',
      },
      {
        label: 'Marcar no presentado',
        onClick: () => { setReservaAccion(r); setAccionTipo('no_presentado') },
        oculto: !activa && r.estado !== 'pendiente_no_presentado',
      },
      {
        label: 'Deshacer marca',
        onClick: () => { setReservaAccion(r); setAccionTipo('deshacer') },
        oculto: !marcada,
      },
    ]
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE)

  const modalTitulos: Record<string, string> = {
    cancelar: 'Cancelar reserva',
    presentado: 'Marcar como presentado',
    no_presentado: 'Marcar como no presentado',
    deshacer: 'Deshacer marca',
  }

  return (
    <AdminLayout titulo="Reservas">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {exito && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            {exito}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoReserva | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente_pago">Pendiente pago</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
              <option value="no_presentado">No presentado</option>
              <option value="pendiente_no_presentado">Pte. revisar</option>
            </select>
            <button
              onClick={aplicarFiltros}
              className={`px-4 py-2 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
            >
              Filtrar
            </button>
            {(filtroEstado || filtroFecha) && (
              <button
                onClick={() => { setFiltroEstado(''); setFiltroFecha(''); setPagina(0); setSearchParams({}) }}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{total} reserva{total !== 1 ? 's' : ''}</p>
          <Link
            to="/admin/reservas/nueva"
            className={`px-4 py-2 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
          >
            + Nueva reserva
          </Link>
        </div>

        {/* Tabla */}
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
          </div>
        ) : reservas.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            No se encontraron reservas
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Horario</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Recurso</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Vivienda</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservas.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{formatFecha(r.inicio)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatHora(r.inicio)}–{formatHora(r.fin)}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{r.recurso_nombre}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/usuarios/${r.usuario_id}`} className={`${tema.acento} hover:underline`}>
                          {r.usuario_nombre} {r.usuario_apellidos}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Link to={`/admin/viviendas/${r.vivienda_id}`} className={`text-gray-600 hover:${tema.acento} hover:underline`}>
                          {r.vivienda_ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><BadgeEstado estado={r.estado} tipo="reserva" /></td>
                      <td className="px-4 py-3">
                        <DropdownAcciones acciones={accionesReserva(r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setPagina(Math.max(0, pagina - 1))}
                  disabled={pagina === 0}
                  className="text-sm text-gray-600 disabled:text-gray-300"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-gray-500">
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(Math.min(totalPaginas - 1, pagina + 1))}
                  disabled={pagina >= totalPaginas - 1}
                  className="text-sm text-gray-600 disabled:text-gray-300"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {reservaAccion && accionTipo && (
        <ModalConfirmacion
          titulo={modalTitulos[accionTipo]}
          mensaje={`¿${modalTitulos[accionTipo]} de ${reservaAccion.usuario_nombre} ${reservaAccion.usuario_apellidos} (${formatFecha(reservaAccion.inicio)} ${formatHora(reservaAccion.inicio)})?`}
          textoConfirmar="Confirmar"
          destructivo={accionTipo === 'cancelar' || accionTipo === 'no_presentado'}
          requiereMotivo={accionTipo === 'cancelar'}
          cargando={procesando}
          onConfirmar={ejecutarAccion}
          onCancelar={() => { setReservaAccion(null); setAccionTipo(null) }}
        />
      )}
    </AdminLayout>
  )
}
