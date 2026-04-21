import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import BadgeEstado from '../../components/admin/BadgeEstado'
import DropdownAcciones from '../../components/admin/DropdownAcciones'
import ModalConfirmacion from '../../components/admin/ModalConfirmacion'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import { cancelarReserva, marcarAsistencia, registrarPago } from '../../lib/api'
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
  recurso_tipo: string
  recurso_coste: number
  recurso_fianza: number
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
  const [filtroRecurso, setFiltroRecurso] = useState(searchParams.get('recurso') || '')
  const [filtroVivienda, setFiltroVivienda] = useState(searchParams.get('vivienda') || '')
  const [filtroUsuario, setFiltroUsuario] = useState(searchParams.get('usuario') || '')
  const [pagina, setPagina] = useState(0)

  // Opciones para dropdowns
  const [recursos, setRecursos] = useState<{ id: string; nombre: string }[]>([])
  const [viviendasOpts, setViviendasOpts] = useState<{ id: string; referencia: string }[]>([])

  useEffect(() => {
    supabase.from('recursos').select('id, nombre').order('nombre').then(({ data }) => {
      if (data) setRecursos(data)
    })
    supabase.from('viviendas').select('id, referencia').order('referencia').then(({ data }) => {
      if (data) setViviendasOpts(data)
    })
  }, [])

  // Modal
  const [reservaAccion, setReservaAccion] = useState<ReservaAdmin | null>(null)
  const [accionTipo, setAccionTipo] = useState<'cancelar' | 'presentado' | 'no_presentado' | 'deshacer' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Modal pago
  const [reservaPago, setReservaPago] = useState<ReservaAdmin | null>(null)
  const [pagoCantidad, setPagoCantidad] = useState('')
  const [pagoFianza, setPagoFianza] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState<'efectivo' | 'bizum' | 'transferencia' | 'otros'>('efectivo')
  const [pagoReferencia, setPagoReferencia] = useState('')

  useEffect(() => {
    cargar()
  }, [pagina, filtroEstado, filtroFecha, filtroRecurso, filtroVivienda, filtroUsuario])

  async function cargar() {
    setCargando(true)
    let query = supabase
      .from('reservas')
      .select(
        'id, inicio, fin, estado, notas, motivo_cancelacion, usuario_id, vivienda_id, usuarios!reservas_usuario_id_fkey(nombre, apellidos), recursos(nombre, tipo, config), viviendas(referencia)',
        { count: 'exact' }
      )

    if (filtroEstado) query = query.eq('estado', filtroEstado)
    if (filtroFecha) {
      const inicio = `${filtroFecha}T00:00:00`
      const fin = `${filtroFecha}T23:59:59`
      query = query.gte('inicio', inicio).lte('inicio', fin)
    }
    if (filtroRecurso) query = query.eq('recurso_id', filtroRecurso)
    if (filtroVivienda) query = query.eq('vivienda_id', filtroVivienda)
    if (filtroUsuario) query = query.eq('usuario_id', filtroUsuario)

    query = query
      .order('inicio', { ascending: false })
      .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1)

    const { data, count } = await query

    setReservas(
      (data || []).map((r: Record<string, unknown>) => {
        const usuario = r.usuarios as { nombre: string; apellidos: string } | null
        const recurso = r.recursos as { nombre: string; tipo: string; config: Record<string, unknown> } | null
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
          recurso_tipo: recurso?.tipo || '',
          recurso_coste: (recurso?.config?.coste_euros as number) ?? 0,
          recurso_fianza: (recurso?.config?.fianza_euros as number) ?? 0,
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
    if (filtroRecurso) params.recurso = filtroRecurso
    if (filtroVivienda) params.vivienda = filtroVivienda
    if (filtroUsuario) params.usuario = filtroUsuario
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
    const activa = ['confirmada', 'pendiente_pago', 'pagado'].includes(r.estado)
    const marcada = ['completada', 'no_presentado', 'pendiente_no_presentado'].includes(r.estado)
    return [
      {
        label: 'Registrar pago',
        onClick: () => { setReservaPago(r); setPagoCantidad(r.recurso_coste ? String(r.recurso_coste) : ''); setPagoFianza(r.recurso_fianza ? String(r.recurso_fianza) : ''); setPagoMetodo('efectivo'); setPagoReferencia('') },
        oculto: r.estado !== 'pendiente_pago',
      },
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

  async function ejecutarPago() {
    if (!reservaPago) return
    const cantidad = parseFloat(pagoCantidad)
    if (isNaN(cantidad) || cantidad < 0) {
      setError('Introduce una cantidad válida')
      return
    }
    if (pagoMetodo === 'otros' && !pagoReferencia.trim()) {
      setError('El campo referencia es obligatorio para el método "Otros"')
      return
    }
    setProcesando(true)
    setError(null)

    const fianza = pagoFianza ? parseFloat(pagoFianza) : undefined
    const { error: err } = await registrarPago({
      reserva_id: reservaPago.id,
      cantidad_euros: cantidad,
      fianza_euros: fianza && !isNaN(fianza) ? fianza : undefined,
      metodo: pagoMetodo,
      referencia: pagoReferencia.trim() || undefined,
    })

    if (err) {
      setError(err)
    } else {
      setExito('Pago registrado')
      cargar()
      setTimeout(() => setExito(null), 3000)
    }

    setReservaPago(null)
    setProcesando(false)
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
              <option value="pagado">Pagado</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
              <option value="no_presentado">No presentado</option>
              <option value="pendiente_no_presentado">Pte. revisar</option>
            </select>
            <select
              value={filtroRecurso}
              onChange={(e) => setFiltroRecurso(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todos los recursos</option>
              {recursos.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
            <select
              value={filtroVivienda}
              onChange={(e) => setFiltroVivienda(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todas las viviendas</option>
              {viviendasOpts.map((v) => (
                <option key={v.id} value={v.id}>{v.referencia}</option>
              ))}
            </select>
            <button
              onClick={aplicarFiltros}
              className={`px-4 py-2 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
            >
              Filtrar
            </button>
            {(filtroEstado || filtroFecha || filtroRecurso || filtroVivienda || filtroUsuario) && (
              <button
                onClick={() => { setFiltroEstado(''); setFiltroFecha(''); setFiltroRecurso(''); setFiltroVivienda(''); setFiltroUsuario(''); setPagina(0); setSearchParams({}) }}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {filtroUsuario && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-800">
            <span>Mostrando reservas de un usuario concreto</span>
            <button
              onClick={() => { setFiltroUsuario(''); setSearchParams({}) }}
              className="ml-auto text-indigo-500 hover:text-indigo-700 font-medium"
            >
              × Quitar filtro
            </button>
          </div>
        )}

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

      {/* Modal acciones */}
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

      {/* Modal registrar pago */}
      {reservaPago && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h2 className="font-bold text-gray-800 mb-1">Registrar pago</h2>
            <p className="text-sm text-gray-500 mb-4">
              {reservaPago.recurso_nombre} — {reservaPago.usuario_nombre} {reservaPago.usuario_apellidos} ({formatFecha(reservaPago.inicio)} {formatHora(reservaPago.inicio)})
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Cantidad (€) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pagoCantidad}
                  onChange={(e) => setPagoCantidad(e.target.value)}
                  placeholder="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Fianza (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pagoFianza}
                  onChange={(e) => setPagoFianza(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Método de pago *</label>
                <select
                  value={pagoMetodo}
                  onChange={(e) => setPagoMetodo(e.target.value as typeof pagoMetodo)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="bizum">Bizum</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Referencia{pagoMetodo === 'otros' ? ' *' : ''}
                </label>
                <input
                  type="text"
                  value={pagoReferencia}
                  onChange={(e) => setPagoReferencia(e.target.value)}
                  placeholder={pagoMetodo === 'otros' ? 'Obligatorio: describe el método' : 'Nº transferencia, concepto…'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setReservaPago(null)}
                className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarPago}
                disabled={procesando || !pagoCantidad}
                className={`flex-1 h-10 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} disabled:opacity-50 transition-colors`}
              >
                {procesando ? 'Registrando…' : 'Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
