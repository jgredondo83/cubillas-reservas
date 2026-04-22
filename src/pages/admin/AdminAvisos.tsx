import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { supabase } from '../../lib/supabase'
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['strong', 'em', 'br', 'a']
const ALLOWED_ATTR = ['href', 'target', 'rel']

type TipoAviso = 'info' | 'advertencia' | 'urgente'

interface Aviso {
  id: string
  tipo: TipoAviso
  titulo: string
  contenido: string
  fecha_inicio: string | null
  fecha_fin: string | null
  activo: boolean
  creado_en: string
}

interface FormAviso {
  tipo: TipoAviso
  titulo: string
  contenido: string
  fecha_inicio: string
  fecha_fin: string
}

const FORM_VACIO: FormAviso = {
  tipo: 'info',
  titulo: '',
  contenido: '',
  fecha_inicio: '',
  fecha_fin: '',
}

const TIPO_ESTILOS: Record<TipoAviso, { badge: string; label: string; icono: string }> = {
  info:        { badge: 'bg-blue-100 text-blue-800',   label: 'Info',        icono: 'ℹ️' },
  advertencia: { badge: 'bg-amber-100 text-amber-800', label: 'Advertencia', icono: '⚠️' },
  urgente:     { badge: 'bg-red-100 text-red-800',     label: 'Urgente',     icono: '🚨' },
}

export default function AdminAvisos() {
  const [avisoActivo, setAvisoActivo] = useState<Aviso | null>(null)
  const [historial, setHistorial] = useState<Aviso[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editando, setEditando] = useState<string | null>(null) // id del aviso en edición
  const [form, setForm] = useState<FormAviso>(FORM_VACIO)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; mensaje: string } | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('avisos')
      .select('*')
      .order('creado_en', { ascending: false })

    const lista = (data as Aviso[]) ?? []
    setAvisoActivo(lista.find((a) => a.activo) ?? null)
    setHistorial(lista.filter((a) => !a.activo))
    setCargando(false)
  }

  function mostrarToast(tipo: 'ok' | 'error', mensaje: string) {
    setToast({ tipo, mensaje })
    setTimeout(() => setToast(null), 4000)
  }

  function abrirCrear() {
    setForm(FORM_VACIO)
    setEditando(null)
    setErrorForm(null)
    setMostrarFormulario(true)
  }

  function abrirEditar(aviso: Aviso) {
    setForm({
      tipo: aviso.tipo,
      titulo: aviso.titulo,
      contenido: aviso.contenido,
      fecha_inicio: aviso.fecha_inicio ? aviso.fecha_inicio.slice(0, 10) : '',
      fecha_fin: aviso.fecha_fin ? aviso.fecha_fin.slice(0, 10) : '',
    })
    setEditando(aviso.id)
    setErrorForm(null)
    setMostrarFormulario(true)
  }

  function validarForm(): boolean {
    if (!form.titulo.trim()) { setErrorForm('El título es obligatorio'); return false }
    if (!form.contenido.trim()) { setErrorForm('El contenido es obligatorio'); return false }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setErrorForm('La fecha de fin debe ser posterior a la fecha de inicio')
      return false
    }
    setErrorForm(null)
    return true
  }

  async function handleGuardar() {
    if (!validarForm()) return
    setGuardando(true)

    const avisoPayload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      contenido: form.contenido.trim(),
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      ...(editando ? { id: editando } : {}),
    }

    const { data, error } = await supabase.functions.invoke('gestionar-aviso', {
      body: {
        accion: editando ? 'actualizar' : 'crear',
        aviso: avisoPayload,
      },
    })

    setGuardando(false)

    if (error || !data?.ok) {
      mostrarToast('error', 'Error al guardar el aviso. Inténtalo de nuevo.')
      return
    }

    setMostrarFormulario(false)
    setEditando(null)
    mostrarToast('ok', editando ? 'Aviso actualizado.' : 'Aviso creado y activado.')
    await cargar()
  }

  async function handleDesactivar(id: string) {
    if (!confirm('¿Desactivar este aviso? Dejará de mostrarse a los vecinos.')) return
    setProcesando(true)

    const { data, error } = await supabase.functions.invoke('gestionar-aviso', {
      body: { accion: 'desactivar', aviso: { id } },
    })

    setProcesando(false)

    if (error || !data?.ok) {
      mostrarToast('error', 'Error al desactivar el aviso.')
      return
    }

    mostrarToast('ok', 'Aviso desactivado.')
    await cargar()
  }

  return (
    <AdminLayout titulo="Avisos globales">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-gray-800">Avisos globales</h2>
          <p className="text-sm text-gray-500 mt-1">
            Mensaje destacado que aparece a todos los vecinos. Solo puede haber un aviso activo a la vez.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
            toast.tipo === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {toast.mensaje}
          </div>
        )}

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
          </div>
        ) : (
          <>
            {/* Aviso actual */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Aviso activo ahora</h3>

              {avisoActivo ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{TIPO_ESTILOS[avisoActivo.tipo].icono}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_ESTILOS[avisoActivo.tipo].badge}`}>
                          {TIPO_ESTILOS[avisoActivo.tipo].label}
                        </span>
                        <p className="font-semibold text-gray-800 text-sm">{avisoActivo.titulo}</p>
                      </div>
                      <div
                        className="text-sm text-gray-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(avisoActivo.contenido, { ALLOWED_TAGS, ALLOWED_ATTR }) }}
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        {avisoActivo.fecha_inicio
                          ? `Desde: ${new Date(avisoActivo.fecha_inicio).toLocaleDateString('es-ES')}`
                          : 'Sin fecha de inicio'}
                        {' · '}
                        {avisoActivo.fecha_fin
                          ? `Hasta: ${new Date(avisoActivo.fecha_fin).toLocaleDateString('es-ES')}`
                          : 'Sin fecha de fin (permanente)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => abrirEditar(avisoActivo)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDesactivar(avisoActivo.id)}
                      disabled={procesando}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-4">No hay ningún aviso activo ahora mismo.</p>
                  <button
                    onClick={abrirCrear}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
                  >
                    + Crear nuevo aviso
                  </button>
                </div>
              )}

              {avisoActivo && !mostrarFormulario && (
                <button
                  onClick={abrirCrear}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  + Crear nuevo aviso (desactivará el actual)
                </button>
              )}
            </div>

            {/* Formulario crear/editar */}
            {mostrarFormulario && (
              <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {editando ? 'Editar aviso' : 'Nuevo aviso'}
                </h3>

                {/* Tipo */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Tipo</p>
                  <div className="flex flex-wrap gap-3">
                    {(['info', 'advertencia', 'urgente'] as TipoAviso[]).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tipo"
                          value={t}
                          checked={form.tipo === t}
                          onChange={() => setForm((f) => ({ ...f, tipo: t }))}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_ESTILOS[t].badge}`}>
                          {TIPO_ESTILOS[t].icono} {TIPO_ESTILOS[t].label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ej: Cierre por mantenimiento este fin de semana"
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Contenido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contenido * <span className="text-gray-400 font-normal">(Puedes usar &lt;strong&gt;, &lt;br&gt;, &lt;a href=""&gt;)</span>
                  </label>
                  <textarea
                    value={form.contenido}
                    onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))}
                    rows={3}
                    placeholder="Descripción del aviso para los vecinos..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  />
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha inicio <span className="text-gray-400 font-normal">(vacío = desde ahora)</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha_inicio}
                      onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha fin <span className="text-gray-400 font-normal">(vacío = permanente)</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha_fin}
                      onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {errorForm && (
                  <p className="text-sm text-red-600">{errorForm}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => { setMostrarFormulario(false); setEditando(null) }}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <div>
                <button
                  onClick={() => setMostrarHistorial(!mostrarHistorial)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <span>{mostrarHistorial ? '▼' : '▶'}</span>
                  Avisos anteriores ({historial.length})
                </button>

                {mostrarHistorial && (
                  <div className="mt-3 space-y-2">
                    {historial.map((a) => (
                      <div key={a.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2">
                        <span className="text-sm opacity-60">{TIPO_ESTILOS[a.tipo]?.icono}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 truncate">{a.titulo}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(a.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TIPO_ESTILOS[a.tipo]?.badge} opacity-60`}>
                          {TIPO_ESTILOS[a.tipo]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
