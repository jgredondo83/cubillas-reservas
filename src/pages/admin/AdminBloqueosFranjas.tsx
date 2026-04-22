import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import type { Recurso } from '../../types/database'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

interface BloqueoFranja {
  id: string
  recurso_id: string
  fecha_inicio: string
  fecha_fin: string | null
  hora_inicio: string
  hora_fin: string
  motivo: string
  activo: boolean
  creado_en: string
  recursos: { nombre: string } | null
}

interface ReservaConflicto {
  id: string
  inicio: string
  fin: string
  usuario_nombre: string
  vivienda_referencia: string
}

interface FormState {
  recurso_id: string
  fecha_inicio: string
  fecha_fin: string
  hora_inicio: string
  hora_fin: string
  motivo: string
}

const FORM_INICIAL: FormState = {
  recurso_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  hora_inicio: '',
  hora_fin: '',
  motivo: '',
}

function formatFecha(iso: string | null): string {
  if (!iso) return 'Indefinido'
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminBloqueosFranjas() {
  const tema = useTemaAdmin()

  const [bloqueos, setBloqueos] = useState<BloqueoFranja[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editando, setEditando] = useState<BloqueoFranja | null>(null)
  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [conflictos, setConflictos] = useState<ReservaConflicto[]>([])
  const [mostrarConflictos, setMostrarConflictos] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [bloqueoRes, recursoRes] = await Promise.all([
      supabase
        .from('bloqueos')
        .select('id, recurso_id, fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, activo, creado_en, recursos(nombre)')
        .eq('comunidad_id', COMUNIDAD_ID)
        .not('fecha_inicio', 'is', null)
        .order('activo', { ascending: false })
        .order('fecha_inicio', { ascending: true }),
      supabase
        .from('recursos')
        .select('*')
        .eq('comunidad_id', COMUNIDAD_ID)
        .eq('activo', true)
        .order('nombre'),
    ])

    setBloqueos((bloqueoRes.data as BloqueoFranja[] | null) || [])
    setRecursos((recursoRes.data as Recurso[] | null) || [])
    setCargando(false)
  }

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function abrirFormularioNuevo() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErrorForm(null)
    setConflictos([])
    setMostrarConflictos(false)
    setMostrarFormulario(true)
  }

  function abrirFormularioEditar(b: BloqueoFranja) {
    setEditando(b)
    setForm({
      recurso_id: b.recurso_id,
      fecha_inicio: b.fecha_inicio,
      fecha_fin: b.fecha_fin ?? '',
      hora_inicio: b.hora_inicio.slice(0, 5),
      hora_fin: b.hora_fin.slice(0, 5),
      motivo: b.motivo,
    })
    setErrorForm(null)
    setConflictos([])
    setMostrarConflictos(false)
    setMostrarFormulario(true)
  }

  function cerrarFormulario() {
    setMostrarFormulario(false)
    setEditando(null)
    setForm(FORM_INICIAL)
    setErrorForm(null)
    setConflictos([])
    setMostrarConflictos(false)
  }

  async function llamarEF(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('gestionar-bloqueo-franja', { body })
    if (error) {
      // FunctionsHttpError tiene context con la Response original — intentar leer el body
      try {
        const ctx = (error as unknown as { context?: Response }).context
        if (ctx) {
          const errData = await ctx.json()
          return { ok: false, data: errData }
        }
      } catch { /* ignorar */ }
      return { ok: false, data: { error: error.message } }
    }
    return { ok: true, data }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorForm(null)

    if (!form.recurso_id || !form.fecha_inicio || !form.hora_inicio || !form.hora_fin || !form.motivo) {
      setErrorForm('Todos los campos excepto fecha fin son obligatorios.')
      return
    }

    if (form.hora_fin <= form.hora_inicio) {
      setErrorForm('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    setGuardando(true)

    // Si estamos editando, primero desactivamos el antiguo y creamos uno nuevo
    // (más simple que un UPDATE parcial — los bloqueos son inmutables por diseño)

    // Paso 1: verificar conflictos
    const bloqData = {
      recurso_id: form.recurso_id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      motivo: form.motivo,
    }

    const { ok, data } = await llamarEF({ accion: 'verificar_conflictos', bloqueo: bloqData })

    if (!ok) {
      setErrorForm(data.error ?? 'Error al verificar conflictos')
      setGuardando(false)
      return
    }

    if (data.tiene_conflictos) {
      setConflictos(data.reservas)
      setMostrarConflictos(true)
      setGuardando(false)
      return
    }

    // Sin conflictos: crear
    await crearBloqueo(bloqData)
  }

  async function crearBloqueo(bloqData: Record<string, unknown>) {
    setGuardando(true)
    setErrorForm(null)

    // Si editamos, primero desactivamos el anterior
    if (editando) {
      await llamarEF({ accion: 'desactivar', bloqueo: { id: editando.id } })
    }

    const { ok, data } = await llamarEF({ accion: 'crear', bloqueo: bloqData })

    if (!ok) {
      if (data.reservas) {
        setConflictos(data.reservas)
        setMostrarConflictos(true)
      } else {
        setErrorForm(data.error ?? 'Error al crear el bloqueo')
      }
      setGuardando(false)
      return
    }

    cerrarFormulario()
    await cargarDatos()
    mostrarToast(editando ? 'Bloqueo actualizado correctamente.' : 'Bloqueo creado correctamente.')
    setGuardando(false)
  }

  async function handleDesactivar(id: string) {
    const { ok, data } = await llamarEF({ accion: 'desactivar', bloqueo: { id } })
    if (!ok) {
      mostrarToast(data.error ?? 'Error al desactivar')
      return
    }
    await cargarDatos()
    mostrarToast('Bloqueo desactivado.')
  }

  const activos = bloqueos.filter((b) => b.activo)
  const historial = bloqueos.filter((b) => !b.activo)

  return (
    <AdminLayout titulo="Bloqueos de franjas horarias">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-gray-500">
          Bloquea horarios específicos de un recurso por mantenimiento, torneos o cualquier motivo.
          Los vecinos no podrán reservar en ese periodo.
        </p>
      </div>

      {/* Botón crear */}
      {!mostrarFormulario && (
        <button
          onClick={abrirFormularioNuevo}
          className={`mb-6 px-5 py-2.5 rounded-lg text-sm text-white font-medium ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
        >
          + Crear nuevo bloqueo
        </button>
      )}

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">
            {editando ? 'Editar bloqueo' : 'Nuevo bloqueo'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recurso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurso *</label>
              <select
                value={form.recurso_id}
                onChange={(e) => setForm({ ...form, recurso_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                required
              >
                <option value="">Selecciona un recurso…</option>
                {recursos.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha fin{' '}
                  <span className="text-gray-400 font-normal">(vacío = indefinido)</span>
                </label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  min={form.fecha_inicio || undefined}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Horas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio *</label>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin *</label>
                <input
                  type="time"
                  value={form.hora_fin}
                  onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
              <textarea
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej: Torneo interno, obras de mantenimiento…"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                required
              />
            </div>

            {errorForm && (
              <p className="text-sm text-red-600">{errorForm}</p>
            )}

            {/* Alerta de conflictos */}
            {mostrarConflictos && conflictos.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  ⚠️ Hay {conflictos.length} reserva(s) activa(s) en esta franja.
                  Cancélalas manualmente antes de aplicar el bloqueo.
                </p>
                <ul className="space-y-1 mb-3">
                  {conflictos.map((r) => (
                    <li key={r.id} className="text-xs text-amber-700 flex items-center gap-2">
                      <span>
                        {new Date(r.inicio).toLocaleString('es-ES', {
                          timeZone: 'Europe/Madrid',
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' '}— {r.usuario_nombre} ({r.vivienda_referencia})
                      </span>
                      <Link
                        to={`/admin/reservas?id=${r.id}`}
                        className="underline shrink-0"
                        target="_blank"
                      >
                        Ver →
                      </Link>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarConflictos(false)
                    setConflictos([])
                  }}
                  className="text-xs text-amber-700 underline"
                >
                  Ya las he cancelado, volver a intentar
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={guardando}
                className={`flex-1 h-10 rounded-lg text-sm text-white font-medium ${tema.btnPrimario} ${tema.btnPrimarioHover} disabled:opacity-50 transition-colors`}
              >
                {guardando ? 'Comprobando…' : (editando ? 'Guardar cambios' : 'Crear bloqueo')}
              </button>
              <button
                type="button"
                onClick={cerrarFormulario}
                className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista bloqueos activos */}
      {cargando ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-500" />
        </div>
      ) : (
        <>
          <h2 className="font-bold text-gray-800 mb-3">Bloqueos activos</h2>

          {activos.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm mb-6">
              No hay bloqueos activos.
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {activos.map((b) => (
                <TarjetaBloqueo
                  key={b.id}
                  bloqueo={b}
                  onEditar={() => abrirFormularioEditar(b)}
                  onDesactivar={() => handleDesactivar(b.id)}
                />
              ))}
            </div>
          )}

          {/* Historial */}
          {historial.length > 0 && (
            <>
              <button
                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                className="text-sm text-gray-500 mb-3 flex items-center gap-1"
              >
                <span>{mostrarHistorial ? '▼' : '▶'}</span>
                Bloqueos anteriores ({historial.length})
              </button>

              {mostrarHistorial && (
                <div className="space-y-3">
                  {historial.map((b) => (
                    <TarjetaBloqueo
                      key={b.id}
                      bloqueo={b}
                      historial
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </AdminLayout>
  )
}

interface TarjetaProps {
  bloqueo: BloqueoFranja
  historial?: boolean
  onEditar?: () => void
  onDesactivar?: () => void
}

function TarjetaBloqueo({ bloqueo: b, historial, onEditar, onDesactivar }: TarjetaProps) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className={`bg-white border rounded-xl p-4 ${historial ? 'border-gray-100 opacity-70' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-800 text-sm truncate">
              {b.recursos?.nombre ?? 'Recurso desconocido'}
            </span>
            {historial && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
                Inactivo
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            📅 {formatFecha(b.fecha_inicio)} → {b.fecha_fin ? formatFecha(b.fecha_fin) : 'indefinido'}
          </p>
          <p className="text-xs text-gray-500">
            🕐 {b.hora_inicio.slice(0, 5)} – {b.hora_fin.slice(0, 5)}
          </p>
          <p className="text-sm text-gray-700 mt-1">{b.motivo}</p>
        </div>

        {!historial && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={onEditar}
              className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Editar
            </button>
            {!confirmando ? (
              <button
                onClick={() => setConfirmando(true)}
                className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Desactivar
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => { setConfirmando(false); onDesactivar?.() }}
                  className="text-xs px-2 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sí
                </button>
                <button
                  onClick={() => setConfirmando(false)}
                  className="text-xs px-2 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
