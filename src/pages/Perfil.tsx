import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { NivelPadel, Vivienda } from '../types/database'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

const NIVELES_PADEL: { valor: NivelPadel; etiqueta: string }[] = [
  { valor: 'iniciacion', etiqueta: 'Iniciación — Estoy empezando' },
  { valor: 'basico', etiqueta: 'Básico — Juego de vez en cuando' },
  { valor: 'intermedio', etiqueta: 'Intermedio — Juego regularmente' },
  { valor: 'intermedio_alto', etiqueta: 'Intermedio-alto — Compito en torneos' },
  { valor: 'avanzado', etiqueta: 'Avanzado — Nivel competitivo alto' },
]

export default function Perfil() {
  const { user, perfil, recargarPerfil } = useAuth()
  const navigate = useNavigate()

  // Campos editables
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [alias, setAlias] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nivelPadel, setNivelPadel] = useState<NivelPadel | ''>('')

  // Estado UI
  const [viviendaRef, setViviendaRef] = useState<string>('—')
  const [viviendas, setViviendas] = useState<Vivienda[]>([])
  const [guardando, setGuardando] = useState(false)
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; mensaje: string } | null>(null)
  const [descargando, setDescargando] = useState(false)

  // Estado modal eliminar cuenta
  const [modalEliminar, setModalEliminar] = useState(false)
  const [confirmacionTexto, setConfirmacionTexto] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  useEffect(() => {
    if (!perfil) return
    setNombre(perfil.nombre ?? '')
    setApellidos(perfil.apellidos ?? '')
    setAlias(perfil.alias ?? '')
    setTelefono(perfil.telefono ?? '')
    setNivelPadel((perfil.nivel_padel_autoevaluado as NivelPadel | null) ?? '')
  }, [perfil])

  useEffect(() => {
    if (!perfil || viviendas.length === 0) return
    const v = viviendas.find((x) => x.id === perfil.vivienda_id)
    setViviendaRef(v?.referencia ?? '—')
  }, [perfil, viviendas])

  useEffect(() => {
    supabase
      .from('viviendas')
      .select('*')
      .eq('comunidad_id', COMUNIDAD_ID)
      .order('referencia')
      .then(({ data }) => setViviendas((data as Vivienda[]) ?? []))
  }, [])

  function mostrarToast(tipo: 'ok' | 'error', mensaje: string) {
    setToast({ tipo, mensaje })
    setTimeout(() => setToast(null), 4000)
  }

  function validar(): boolean {
    const errores: Record<string, string> = {}
    if (!nombre.trim()) errores.nombre = 'El nombre es obligatorio'
    if (!apellidos.trim()) errores.apellidos = 'Los apellidos son obligatorios'
    const telLimpio = telefono.replace(/[\s\-]/g, '').replace(/^\+34/, '')
    if (!telLimpio || telLimpio.length < 9) {
      errores.telefono = 'Teléfono obligatorio (mínimo 9 dígitos)'
    }
    setErroresCampo(errores)
    return Object.keys(errores).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar() || !user) return

    setGuardando(true)
    const { error } = await supabase
      .from('usuarios')
      .update({
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        alias: alias.trim() || null,
        telefono: telefono.trim(),
        nivel_padel_autoevaluado: nivelPadel || null,
      })
      .eq('id', user.id)

    setGuardando(false)

    if (error) {
      mostrarToast('error', 'Error al guardar los cambios: ' + error.message)
      return
    }

    await recargarPerfil()
    mostrarToast('ok', 'Cambios guardados')
  }

  async function handleDescargarDatos() {
    setDescargando(true)
    try {
      const { data, error } = await supabase.functions.invoke('exportar-mis-datos')
      if (error) throw error
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cubillas-mis-datos-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error al descargar datos:', err)
      mostrarToast('error', 'No se pudieron descargar los datos. Inténtalo de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  async function handleEliminarCuenta() {
    if (confirmacionTexto !== 'ELIMINAR') return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      const { error } = await supabase.functions.invoke('eliminar-cuenta')
      if (error) throw error
      await supabase.auth.signOut()
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setErrorEliminar('No se pudo eliminar la cuenta: ' + msg)
      setEliminando(false)
    }
  }

  const emailActual = user?.email ?? ''
  const fechaRegistro = perfil?.created_at
    ? new Date(perfil.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const esAdmin = perfil?.rol === 'admin' || perfil?.rol === 'super_admin'

  return (
    <main className="min-h-screen bg-teal-50 py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* 1. Encabezado */}
        <div className="flex items-center gap-3">
          <Link to="/" className="text-teal-600 text-sm">← Volver</Link>
          <h1 className="text-xl font-bold text-teal-700">Mi perfil</h1>
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

        {/* 2. Formulario editable */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-teal-100 p-6 space-y-5">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              id="nombre" type="text" value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            {erroresCampo.nombre && <p className="text-sm text-red-600 mt-1">{erroresCampo.nombre}</p>}
          </div>

          <div>
            <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
            <input
              id="apellidos" type="text" value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            {erroresCampo.apellidos && <p className="text-sm text-red-600 mt-1">{erroresCampo.apellidos}</p>}
          </div>

          <div>
            <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-1">
              Alias público <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="alias" type="text" value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej: Jaime G."
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Solo se usa en partidos abiertos de pádel. Si está vacío, otros vecinos te ven como «Nombre + inicial del apellido».
            </p>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
            <input
              id="telefono" type="tel" value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="600 123 456"
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            {erroresCampo.telefono && <p className="text-sm text-red-600 mt-1">{erroresCampo.telefono}</p>}
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Nivel de pádel <span className="text-gray-400 font-normal">(opcional)</span>
            </p>
            <div className="space-y-2">
              {NIVELES_PADEL.map((n) => (
                <label key={n.valor} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio" name="nivelPadel" value={n.valor}
                    checked={nivelPadel === n.valor}
                    onChange={(e) => setNivelPadel(e.target.value as NivelPadel)}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">{n.etiqueta}</span>
                </label>
              ))}
              {nivelPadel && (
                <button type="button" onClick={() => setNivelPadel('')} className="text-xs text-gray-400 hover:text-gray-600 mt-1">
                  Quitar selección
                </button>
              )}
            </div>
          </div>

          <button
            type="submit" disabled={guardando}
            className="w-full h-12 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>

        {/* 3. Información solo lectura */}
        <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Email</p>
            <p className="text-sm text-gray-500">
              Para cambiarlo, contacta con administración. Email actual:{' '}
              <span className="font-medium text-gray-700">{emailActual}</span>
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Vivienda</p>
            <p className="text-sm text-gray-500">
              Para cambiar de vivienda, contacta con administración. Vivienda actual:{' '}
              <span className="font-medium text-gray-700">{viviendaRef}</span>
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Fecha de registro</p>
            <p className="text-sm text-gray-500">{fechaRegistro}</p>
          </div>
        </div>

        {/* 4. Mis datos (RGPD Art. 20) */}
        <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Mis datos</h2>
          <p className="text-xs text-gray-500 mb-3">
            Descarga una copia de todos tus datos personales almacenados (RGPD Art. 20).
          </p>
          <button
            type="button" onClick={handleDescargarDatos} disabled={descargando}
            className="w-full h-10 border border-teal-400 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-50 disabled:opacity-50 transition-colors"
          >
            {descargando ? 'Preparando…' : 'Descargar mis datos'}
          </button>
        </div>

        {/* 5. Zona de peligro */}
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Zona de peligro</h2>
          {esAdmin ? (
            <p className="text-sm text-red-600">
              Los administradores no pueden auto-eliminar su cuenta. Contacta con otro administrador para darte de baja.
            </p>
          ) : (
            <>
              <p className="text-xs text-red-600 mb-3">
                Eliminar tu cuenta borrará todos tus datos personales de forma permanente. Las reservas pasadas se conservan de forma anónima.
              </p>
              <button
                type="button"
                onClick={() => { setModalEliminar(true); setConfirmacionTexto(''); setErrorEliminar(null) }}
                className="w-full h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Eliminar mi cuenta
              </button>
            </>
          )}
        </div>

      </div>

      {/* Modal confirmación eliminación */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-800">Eliminar cuenta</h2>
            <p className="text-sm text-gray-600">
              Esta acción es <strong>irreversible</strong>. Se borrarán todos tus datos personales. Las reservas pasadas quedarán anonimizadas.
              Consulta nuestra{' '}
              <Link to="/politica-privacidad" target="_blank" className="text-teal-600 underline">
                política de privacidad
              </Link>{' '}
              para más información.
            </p>
            <p className="text-sm text-gray-600">
              Escribe <strong>ELIMINAR</strong> para confirmar:
            </p>
            <input
              type="text"
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
            {errorEliminar && <p className="text-sm text-red-600">{errorEliminar}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalEliminar(false)}
                disabled={eliminando}
                className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarCuenta}
                disabled={confirmacionTexto !== 'ELIMINAR' || eliminando}
                className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
