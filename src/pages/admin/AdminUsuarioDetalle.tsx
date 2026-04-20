import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import BadgeEstado from '../../components/admin/BadgeEstado'
import BadgeRol from '../../components/admin/BadgeRol'
import DropdownAcciones from '../../components/admin/DropdownAcciones'
import ModalConfirmacion from '../../components/admin/ModalConfirmacion'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import { useAuth } from '../../hooks/useAuth'
import { gestionarUsuario } from '../../lib/api'
import type { Usuario, RolUsuario, EstadoUsuario, EstadoReserva } from '../../types/database'

type AccionUsuario = 'verificar' | 'bloquear' | 'desbloquear' | 'cambiar_rol' | 'eliminar' | 'cambiar_email' | null

interface ReservaHistorial {
  id: string
  inicio: string
  fin: string
  estado: EstadoReserva
  recurso_nombre: string
}

interface LogEntry {
  id: string
  accion: string
  created_at: string
  admin_nombre: string
  detalle: Record<string, unknown>
}

interface Stats {
  total: number
  completadas: number
  noPresentadas: number
  canceladas: number
}

export default function AdminUsuarioDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tema = useTemaAdmin()
  const { perfil: perfilAuth } = useAuth()
  const esSuper = perfilAuth?.rol === 'super_admin'

  const [usuario, setUsuario] = useState<Usuario & { vivienda_ref?: string; vivienda_bloqueada?: boolean } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [accionPendiente, setAccionPendiente] = useState<AccionUsuario>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Email editing (super_admin only)
  const [editandoEmail, setEditandoEmail] = useState(false)
  const [nuevoEmail, setNuevoEmail] = useState('')

  // Bloqueo custom modal
  const [mostrarModalBloqueo, setMostrarModalBloqueo] = useState(false)
  const [bloqueoFechaFin, setBloqueoFechaFin] = useState('')
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')

  // Edición inline
  const [editando, setEditando] = useState(false)
  const [formNombre, setFormNombre] = useState('')
  const [formApellidos, setFormApellidos] = useState('')
  const [formAlias, setFormAlias] = useState('')
  const [formTelefono, setFormTelefono] = useState('')
  const [formRol, setFormRol] = useState<RolUsuario>('vecino')
  const [formEstado, setFormEstado] = useState<EstadoUsuario>('pendiente')
  const [formViviendaId, setFormViviendaId] = useState('')
  const [viviendas, setViviendas] = useState<{ id: string; referencia: string }[]>([])

  // Secciones extra
  const [reservas, setReservas] = useState<ReservaHistorial[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, completadas: 0, noPresentadas: 0, canceladas: 0 })
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    cargar()
    cargarViviendas()
  }, [id])

  async function cargarViviendas() {
    const { data } = await supabase.from('viviendas').select('id, referencia').order('referencia')
    if (data) setViviendas(data)
  }

  async function cargar() {
    if (!id) return
    setCargando(true)

    const { data: userData } = await supabase
      .from('usuarios')
      .select('*, viviendas(referencia, bloqueada_por_impago)')
      .eq('id', id)
      .single()

    if (userData) {
      const viv = userData.viviendas as { referencia: string; bloqueada_por_impago: boolean } | null
      const u = {
        ...(userData as unknown as Usuario),
        vivienda_ref: viv?.referencia || '---',
        vivienda_bloqueada: viv?.bloqueada_por_impago ?? false,
      }
      setUsuario(u)
      setFormNombre(u.nombre)
      setFormApellidos(u.apellidos)
      setFormAlias(u.alias || '')
      setFormTelefono(u.telefono)
      setFormRol(u.rol)
      setFormEstado(u.estado)
      setFormViviendaId(u.vivienda_id)
    }

    // Cargar reservas, stats, logs en paralelo
    await Promise.all([
      cargarReservas(),
      cargarStats(),
      cargarLogs(),
    ])

    setCargando(false)
  }

  async function cargarReservas() {
    if (!id) return
    const { data } = await supabase
      .from('reservas')
      .select('id, inicio, fin, estado, recursos(nombre)')
      .eq('usuario_id', id)
      .order('inicio', { ascending: false })
      .limit(10)

    setReservas(
      (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        inicio: r.inicio as string,
        fin: r.fin as string,
        estado: r.estado as EstadoReserva,
        recurso_nombre: (r.recursos as { nombre: string } | null)?.nombre || '---',
      }))
    )
  }

  async function cargarStats() {
    if (!id) return
    const [total, completadas, noPresentadas, canceladas] = await Promise.all([
      supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('usuario_id', id),
      supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('usuario_id', id).eq('estado', 'completada'),
      supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('usuario_id', id).eq('estado', 'no_presentado'),
      supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('usuario_id', id).eq('estado', 'cancelada'),
    ])
    setStats({
      total: total.count ?? 0,
      completadas: completadas.count ?? 0,
      noPresentadas: noPresentadas.count ?? 0,
      canceladas: canceladas.count ?? 0,
    })
  }

  async function cargarLogs() {
    if (!id) return
    const { data } = await supabase
      .from('logs_admin')
      .select('id, accion, created_at, detalle, admin_id')
      .eq('target_id', id)
      .eq('target_tipo', 'usuario')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!data || data.length === 0) {
      setLogs([])
      return
    }

    // Resolver nombres de admins
    const adminIds = [...new Set(data.map((l) => l.admin_id))]
    const { data: admins } = await supabase
      .from('usuarios')
      .select('id, nombre, apellidos')
      .in('id', adminIds)

    const adminMap: Record<string, string> = {}
    for (const a of admins || []) {
      adminMap[a.id] = `${a.nombre} ${a.apellidos}`
    }

    setLogs(
      data.map((l) => ({
        id: l.id,
        accion: l.accion,
        created_at: l.created_at,
        admin_nombre: adminMap[l.admin_id] || '---',
        detalle: (l.detalle || {}) as Record<string, unknown>,
      }))
    )
  }

  async function guardarEdicion() {
    if (!id || !usuario) return
    setProcesando(true)
    setError(null)

    const cambios: Record<string, unknown> = {
      nombre: formNombre.trim(),
      apellidos: formApellidos.trim(),
      alias: formAlias.trim() || null,
      telefono: formTelefono.trim(),
      estado: formEstado,
    }
    if (esSuper) cambios.rol = formRol
    if (formViviendaId !== usuario.vivienda_id) cambios.vivienda_id = formViviendaId

    const { error: err } = await supabase
      .from('usuarios')
      .update(cambios)
      .eq('id', id)

    if (err) {
      setError('Error al guardar: ' + err.message)
    } else {
      // Log si cambio vivienda
      if (formViviendaId !== usuario.vivienda_id) {
        const vivAnterior = viviendas.find((v) => v.id === usuario.vivienda_id)?.referencia || usuario.vivienda_id
        const vivNueva = viviendas.find((v) => v.id === formViviendaId)?.referencia || formViviendaId
        await supabase.from('logs_admin').insert({
          comunidad_id: usuario.comunidad_id,
          admin_id: perfilAuth?.id,
          accion: 'usuario_cambiar_vivienda',
          target_tipo: 'usuario',
          target_id: id,
          detalle: { vivienda_anterior: vivAnterior, vivienda_nueva: vivNueva },
        })
      }
      setExito('Usuario actualizado')
      setEditando(false)
      cargar()
      setTimeout(() => setExito(null), 3000)
    }
    setProcesando(false)
  }

  async function ejecutarAccion(motivo?: string) {
    if (!id || !accionPendiente) return
    setProcesando(true)
    setError(null)

    if (accionPendiente === 'eliminar') {
      const { error: err } = await gestionarUsuario({ usuario_id: id, accion: 'eliminar' })
      if (err) {
        setError(err)
      } else {
        navigate('/admin/usuarios')
        return
      }
    } else if (accionPendiente === 'cambiar_email') {
      const { error: err } = await gestionarUsuario({
        usuario_id: id,
        accion: 'cambiar_email',
        nuevo_email: nuevoEmail.trim(),
      })
      if (err) {
        setError(err)
      } else {
        setExito('Email cambiado. Se ha enviado un magic link al nuevo email.')
        setEditandoEmail(false)
        setNuevoEmail('')
        cargar()
        setTimeout(() => setExito(null), 5000)
      }
    } else {
      const { error: err } = await gestionarUsuario({
        usuario_id: id,
        accion: accionPendiente,
        motivo,
        ...(accionPendiente === 'cambiar_rol' ? { nuevo_rol: formRol } : {}),
      })
      if (err) {
        setError(err)
      } else {
        setExito(`Accion "${accionPendiente}" ejecutada`)
        cargar()
        setTimeout(() => setExito(null), 3000)
      }
    }

    setAccionPendiente(null)
    setProcesando(false)
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }
  function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }
  function formatFechaHora(iso: string) {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Usuario">
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
        </div>
      </AdminLayout>
    )
  }

  if (!usuario) {
    return (
      <AdminLayout titulo="Usuario">
        <div className="text-center py-12 text-gray-500">
          Usuario no encontrado.{' '}
          <Link to="/admin/usuarios" className={tema.acento}>Volver</Link>
        </div>
      </AdminLayout>
    )
  }

  const acciones = [
    { label: 'Verificar cuenta', onClick: () => setAccionPendiente('verificar'), oculto: usuario.estado !== 'pendiente' },
    { label: 'Bloquear usuario', onClick: () => { setMostrarModalBloqueo(true); setBloqueoMotivo(''); setBloqueoFechaFin('') }, oculto: usuario.estado === 'bloqueado', destructivo: true },
    { label: 'Desbloquear', onClick: () => setAccionPendiente('desbloquear'), oculto: usuario.estado !== 'bloqueado' },
    { label: 'Eliminar usuario', onClick: () => setAccionPendiente('eliminar'), oculto: !esSuper || usuario.rol === 'super_admin', destructivo: true },
  ]

  const modalConfig: Record<string, { titulo: string; mensaje: string; textoConfirmar: string; destructivo: boolean; requiereMotivo: boolean }> = {
    verificar: { titulo: 'Verificar usuario', mensaje: `Activar la cuenta de ${usuario.nombre} ${usuario.apellidos}?`, textoConfirmar: 'Verificar', destructivo: false, requiereMotivo: false },
    desbloquear: { titulo: 'Desbloquear usuario', mensaje: `Desbloquear a ${usuario.nombre} ${usuario.apellidos}? Se restaurará el estado anterior.`, textoConfirmar: 'Desbloquear', destructivo: false, requiereMotivo: false },
    eliminar: { titulo: 'Eliminar usuario', mensaje: `Eliminar definitivamente a ${usuario.nombre} ${usuario.apellidos}? Esta accion no se puede deshacer.`, textoConfirmar: 'Eliminar', destructivo: true, requiereMotivo: false },
    cambiar_email: { titulo: 'Cambiar email', mensaje: `Cambiar el email de ${usuario.nombre} ${usuario.apellidos} a "${nuevoEmail}". Se enviará un nuevo magic link. El email antiguo dejará de funcionar. ¿Continuar?`, textoConfirmar: 'Cambiar email', destructivo: true, requiereMotivo: false },
  }

  async function ejecutarBloqueo() {
    if (!id || !bloqueoMotivo.trim()) return
    setProcesando(true)
    setError(null)

    const { error: err } = await gestionarUsuario({
      usuario_id: id,
      accion: 'bloquear',
      motivo: bloqueoMotivo.trim(),
      bloqueado_hasta: bloqueoFechaFin || null,
    })

    if (err) {
      setError(err)
    } else {
      setExito('Usuario bloqueado')
      cargar()
      setTimeout(() => setExito(null), 3000)
    }

    setMostrarModalBloqueo(false)
    setProcesando(false)
  }

  return (
    <AdminLayout titulo={`${usuario.nombre} ${usuario.apellidos}`}>
      <div className="max-w-2xl space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
        {exito && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{exito}</div>}

        {/* Cabecera */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{usuario.nombre} {usuario.apellidos}</h2>
              {usuario.alias && <p className="text-sm text-gray-400">"{usuario.alias}"</p>}
              <div className="flex items-center gap-2 mt-2">
                <BadgeRol rol={usuario.rol} />
                <BadgeEstado estado={usuario.estado} />
              </div>
              {usuario.vivienda_bloqueada && (
                <Link
                  to={`/admin/viviendas/${usuario.vivienda_id}`}
                  className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors"
                >
                  Vivienda bloqueada por impago
                </Link>
              )}
            </div>
            <DropdownAcciones acciones={acciones} />
          </div>
        </div>

        {/* Datos */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">Datos del usuario</h3>
            {!editando ? (
              <button onClick={() => setEditando(true)} className={`text-sm ${tema.acento} hover:underline`}>Editar</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setEditando(false); cargar() }} className="text-sm text-gray-500 hover:underline">Cancelar</button>
                <button onClick={guardarEdicion} disabled={procesando} className={`text-sm text-white px-3 py-1 rounded-lg ${tema.btnPrimario} ${tema.btnPrimarioHover} disabled:opacity-50`}>Guardar</button>
              </div>
            )}
          </div>

          {editando ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Nombre</label>
                <input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Apellidos</label>
                <input value={formApellidos} onChange={(e) => setFormApellidos(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Alias</label>
                <input value={formAlias} onChange={(e) => setFormAlias(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Telefono</label>
                <input value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Vivienda</label>
                <select value={formViviendaId} onChange={(e) => setFormViviendaId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {viviendas.map((v) => (
                    <option key={v.id} value={v.id}>{v.referencia}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Estado</label>
                <select value={formEstado} onChange={(e) => setFormEstado(e.target.value as EstadoUsuario)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="pendiente">Pendiente</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              {esSuper && (
                <div>
                  <label className="text-xs text-gray-500">Rol</label>
                  <select value={formRol} onChange={(e) => setFormRol(e.target.value as RolUsuario)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="vecino">Vecino</option>
                    <option value="guarda">Guarda</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="lectura">Lectura</option>
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">Email</label>
                <p className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg">No visible desde el panel (dato de autenticación)</p>
                {esSuper && (
                  <button
                    type="button"
                    onClick={() => setEditandoEmail(true)}
                    className="mt-1 text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1"
                  >
                    ⚠ Cambiar email
                  </button>
                )}
                {!esSuper && (
                  <p className="text-xs text-gray-400 mt-1">Solo un super_admin puede cambiar el email.</p>
                )}
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Vivienda</dt>
                <dd className="font-medium">
                  <Link to={`/admin/viviendas/${usuario.vivienda_id}`} className={`${tema.acento} hover:underline`}>
                    {usuario.vivienda_ref}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Telefono</dt>
                <dd className="text-gray-800 font-medium">{usuario.telefono}</dd>
              </div>
              <div>
                <dt className="text-gray-500">No presentados (30d)</dt>
                <dd className="text-gray-800 font-medium">{usuario.no_presentado_count_30d}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Bloqueado hasta</dt>
                <dd className="text-gray-800 font-medium">
                  {usuario.bloqueado_hasta ? new Date(usuario.bloqueado_hasta).toLocaleDateString('es-ES') : '---'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Nivel padel</dt>
                <dd className="text-gray-800 font-medium">{usuario.nivel_padel_autoevaluado || '---'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Registro</dt>
                <dd className="text-gray-800 font-medium">{new Date(usuario.created_at).toLocaleDateString('es-ES')}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Estadísticas */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Estadísticas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Total reservas</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-700">{stats.completadas}</p>
              <p className="text-xs text-gray-500">Completadas</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-red-700">{stats.noPresentadas}</p>
              <p className="text-xs text-gray-500">No presentado</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-gray-600">{stats.canceladas}</p>
              <p className="text-xs text-gray-500">Canceladas</p>
            </div>
          </div>
        </div>

        {/* Historial de reservas */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Historial de reservas</h3>
          {reservas.length === 0 ? (
            <p className="text-sm text-gray-400">Sin reservas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 font-medium text-gray-600">Fecha</th>
                    <th className="text-left py-2 font-medium text-gray-600">Horario</th>
                    <th className="text-left py-2 font-medium text-gray-600 hidden sm:table-cell">Recurso</th>
                    <th className="text-left py-2 font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservas.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 text-gray-800">{formatFecha(r.inicio)}</td>
                      <td className="py-2 text-gray-600">{formatHora(r.inicio)}-{formatHora(r.fin)}</td>
                      <td className="py-2 text-gray-600 hidden sm:table-cell">{r.recurso_nombre}</td>
                      <td className="py-2"><BadgeEstado estado={r.estado} tipo="reserva" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cambios recientes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Cambios recientes</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">Sin registros</p>
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">{formatFechaHora(l.created_at)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700">{l.accion.replace(/_/g, ' ')}</span>
                    <span className="text-gray-400"> por {l.admin_nombre}</span>
                    {Object.keys(l.detalle).length > 0 && (
                      <p className="text-xs text-gray-400 truncate">
                        {Object.entries(l.detalle).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link to="/admin/usuarios" className={`text-sm ${tema.acento} hover:underline`}>
          ← Volver a usuarios
        </Link>
      </div>

      {accionPendiente && modalConfig[accionPendiente] && (
        <ModalConfirmacion
          {...modalConfig[accionPendiente]}
          cargando={procesando}
          onConfirmar={ejecutarAccion}
          onCancelar={() => setAccionPendiente(null)}
        />
      )}

      {mostrarModalBloqueo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h2 className="font-bold text-gray-800 mb-3">Bloquear a {usuario.nombre} {usuario.apellidos}</h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                Solo se bloqueará a este usuario. El resto de vecinos de su vivienda ({usuario.vivienda_ref}) podrán seguir reservando.
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Si quieres bloquear toda la vivienda por impago,{' '}
                <Link to={`/admin/viviendas/${usuario.vivienda_id}`} className="underline font-medium">
                  ve a la vivienda
                </Link>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Fecha fin del bloqueo (opcional)</label>
                <input
                  type="date"
                  value={bloqueoFechaFin}
                  onChange={(e) => setBloqueoFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Déjalo vacío para bloqueo indefinido. Se podrá desbloquear manualmente.</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Motivo (obligatorio)</label>
                <textarea
                  value={bloqueoMotivo}
                  onChange={(e) => setBloqueoMotivo(e.target.value)}
                  rows={2}
                  placeholder="Motivo del bloqueo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setMostrarModalBloqueo(false)}
                className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarBloqueo}
                disabled={procesando || !bloqueoMotivo.trim()}
                className="flex-1 h-10 rounded-lg text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {procesando ? 'Procesando...' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editandoEmail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-lg">
            <h2 className="font-bold text-gray-800 mb-2">Cambiar email</h2>
            <p className="text-sm text-gray-500 mb-4">
              Introduce el nuevo email para {usuario.nombre} {usuario.apellidos}. Se invalidarán las sesiones actuales y se enviará un magic link.
            </p>
            <input
              type="email"
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              placeholder="nuevo@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditandoEmail(false); setNuevoEmail('') }}
                className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!nuevoEmail.trim()) return
                  setEditandoEmail(false)
                  setAccionPendiente('cambiar_email')
                }}
                disabled={!nuevoEmail.trim()}
                className="flex-1 h-10 rounded-lg text-sm text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
