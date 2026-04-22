import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { supabase } from '../../lib/supabase'

interface TextoAdmin {
  id: string
  clave: string
  titulo: string
  contenido: string
  updated_at: string
}

interface EstadoTexto {
  valor: string
  original: string
  guardando: boolean
  toast: { tipo: 'ok' | 'error'; mensaje: string } | null
}

export default function AdminTextos() {
  const [textos, setTextos] = useState<TextoAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [estados, setEstados] = useState<Record<string, EstadoTexto>>({})

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('textos_admin')
      .select('id, clave, titulo, contenido, updated_at')
      .order('clave', { ascending: true })

    const lista = (data as TextoAdmin[]) ?? []
    setTextos(lista)

    const estadosIniciales: Record<string, EstadoTexto> = {}
    for (const t of lista) {
      estadosIniciales[t.clave] = {
        valor: t.contenido,
        original: t.contenido,
        guardando: false,
        toast: null,
      }
    }
    setEstados(estadosIniciales)
    setCargando(false)
  }

  function actualizarValor(clave: string, valor: string) {
    setEstados((prev) => ({
      ...prev,
      [clave]: { ...prev[clave], valor },
    }))
  }

  function descartar(clave: string) {
    setEstados((prev) => ({
      ...prev,
      [clave]: { ...prev[clave], valor: prev[clave].original },
    }))
  }

  function mostrarToast(clave: string, tipo: 'ok' | 'error', mensaje: string) {
    setEstados((prev) => ({
      ...prev,
      [clave]: { ...prev[clave], toast: { tipo, mensaje } },
    }))
    setTimeout(() => {
      setEstados((prev) => ({
        ...prev,
        [clave]: { ...prev[clave], toast: null },
      }))
    }, 4000)
  }

  async function guardar(clave: string) {
    const estado = estados[clave]
    if (!estado || estado.guardando) return

    setEstados((prev) => ({ ...prev, [clave]: { ...prev[clave], guardando: true } }))

    const { data, error } = await supabase.functions.invoke('actualizar-texto-admin', {
      body: { clave, contenido: estado.valor },
    })

    setEstados((prev) => ({ ...prev, [clave]: { ...prev[clave], guardando: false } }))

    if (error || !data?.ok) {
      mostrarToast(clave, 'error', 'Error al guardar. Inténtalo de nuevo.')
      return
    }

    // Actualizar original para que el botón vuelva a "sin cambios"
    setEstados((prev) => ({
      ...prev,
      [clave]: { ...prev[clave], original: estado.valor },
    }))
    mostrarToast(clave, 'ok', 'Guardado correctamente.')
  }

  return (
    <AdminLayout titulo="Textos del sistema">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Textos del sistema</h2>
          <p className="text-sm text-gray-500 mt-1">
            Edita los textos que aparecen a los vecinos en emails, páginas y mensajes del sistema.
            Puedes usar <code className="bg-gray-100 px-1 rounded text-xs">&lt;strong&gt;</code>,{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">&lt;em&gt;</code>,{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">&lt;br&gt;</code>,{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">&lt;a href=""&gt;</code>.
            Otras etiquetas HTML serán eliminadas por seguridad.
          </p>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
          </div>
        ) : textos.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">No hay textos configurados. Ejecuta la migración 025.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {textos.map((t) => {
              const estado = estados[t.clave]
              if (!estado) return null
              const haycambios = estado.valor !== estado.original

              return (
                <div key={t.clave} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                  {/* Cabecera */}
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{t.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <code>{t.clave}</code>
                      {t.updated_at && (
                        <> · Actualizado {new Date(t.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                    </p>
                  </div>

                  {/* Toast */}
                  {estado.toast && (
                    <div className={`text-sm px-3 py-2 rounded-lg ${
                      estado.toast.tipo === 'ok'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {estado.toast.mensaje}
                    </div>
                  )}

                  {/* Textarea */}
                  <textarea
                    value={estado.valor}
                    onChange={(e) => actualizarValor(t.clave, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  />

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => guardar(t.clave)}
                      disabled={!haycambios || estado.guardando}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        haycambios
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {estado.guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    {haycambios && (
                      <button
                        onClick={() => descartar(t.clave)}
                        className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Descartar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
