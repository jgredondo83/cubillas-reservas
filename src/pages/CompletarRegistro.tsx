import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Vivienda, NivelPadel } from '../types/database'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

const NIVELES_PADEL: { valor: NivelPadel; etiqueta: string }[] = [
  { valor: 'iniciacion', etiqueta: 'Iniciación — Estoy empezando' },
  { valor: 'basico', etiqueta: 'Básico — Juego de vez en cuando' },
  { valor: 'intermedio', etiqueta: 'Intermedio — Juego regularmente' },
  { valor: 'intermedio_alto', etiqueta: 'Intermedio-alto — Compito en torneos' },
  { valor: 'avanzado', etiqueta: 'Avanzado — Nivel competitivo alto' },
]

interface ViviendaConConteo extends Vivienda {
  _registrados: number
}

export default function CompletarRegistro() {
  const { user, recargarPerfil } = useAuth()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [alias, setAlias] = useState('')
  const [telefono, setTelefono] = useState('')
  const [viviendaId, setViviendaId] = useState('')
  const [nivelPadel, setNivelPadel] = useState<NivelPadel | ''>('')
  const [privacidad, setPrivacidad] = useState(false)

  const [viviendas, setViviendas] = useState<ViviendaConConteo[]>([])
  const [cargandoViviendas, setCargandoViviendas] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({})

  useEffect(() => {
    async function cargarViviendas() {
      // Cargar viviendas
      const { data: vivs, error: errViv } = await supabase
        .from('viviendas')
        .select('*')
        .eq('comunidad_id', COMUNIDAD_ID)
        .order('referencia')

      if (errViv || !vivs) {
        console.error('Error cargando viviendas:', errViv)
        setCargandoViviendas(false)
        return
      }

      // Contar usuarios por vivienda
      const { data: conteos } = await supabase
        .from('usuarios')
        .select('vivienda_id')
        .eq('comunidad_id', COMUNIDAD_ID)

      const conteoPorVivienda: Record<string, number> = {}
      conteos?.forEach((u) => {
        conteoPorVivienda[u.vivienda_id] = (conteoPorVivienda[u.vivienda_id] || 0) + 1
      })

      const viviendasConConteo: ViviendaConConteo[] = vivs.map((v) => ({
        ...(v as Vivienda),
        _registrados: conteoPorVivienda[v.id] || 0,
      }))

      setViviendas(viviendasConConteo)
      setCargandoViviendas(false)
    }

    cargarViviendas()
  }, [])

  const validar = (): boolean => {
    const errores: Record<string, string> = {}

    if (!nombre.trim()) errores.nombre = 'El nombre es obligatorio'
    if (!apellidos.trim()) errores.apellidos = 'Los apellidos son obligatorios'

    const telLimpio = telefono.replace(/[\s\-]/g, '').replace(/^\+34/, '')
    if (!telLimpio || telLimpio.length < 9) {
      errores.telefono = 'El teléfono es obligatorio (mínimo 9 dígitos)'
    }

    if (!viviendaId) errores.vivienda = 'Selecciona tu vivienda'
    if (!privacidad) errores.privacidad = 'Debes aceptar la política de privacidad'

    setErroresCampo(errores)
    return Object.keys(errores).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar() || !user) return

    setEnviando(true)
    setError(null)

    const { error: err } = await supabase.from('usuarios').insert({
      id: user.id,
      comunidad_id: COMUNIDAD_ID,
      vivienda_id: viviendaId,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      alias: alias.trim() || null,
      telefono: telefono.trim(),
      rol: 'vecino',
      estado: 'pendiente',
      nivel_padel_autoevaluado: nivelPadel || null,
      consentimiento_privacidad_en: new Date().toISOString(),
    })

    if (err) {
      console.error('Error creando perfil:', err)
      setError('Error al crear tu perfil. Inténtalo de nuevo.')
      setEnviando(false)
      return
    }

    await recargarPerfil()
    navigate('/', { replace: true })
  }

  return (
    <main className="min-h-screen bg-teal-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-teal-700 text-center mb-2">
          Completa tu perfil
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Necesitamos algunos datos para darte de alta como vecino/a
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-teal-100 p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            {erroresCampo.nombre && <p className="text-sm text-red-600 mt-1">{erroresCampo.nombre}</p>}
          </div>

          {/* Apellidos */}
          <div>
            <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">
              Apellidos *
            </label>
            <input
              id="apellidos"
              type="text"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            {erroresCampo.apellidos && <p className="text-sm text-red-600 mt-1">{erroresCampo.apellidos}</p>}
          </div>

          {/* Alias */}
          <div>
            <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-1">
              Alias público <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej: Jaime G."
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Solo es relevante en partidos abiertos de pádel. Si lo dejas vacío, otros vecinos te verán como Nombre + inicial del primer apellido.
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="600 123 456"
              className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              El teléfono es obligatorio para que los vigilantes puedan contactarte en caso de incidencia.
            </p>
            {erroresCampo.telefono && <p className="text-sm text-red-600 mt-1">{erroresCampo.telefono}</p>}
          </div>

          {/* Vivienda */}
          <div>
            <label htmlFor="vivienda" className="block text-sm font-medium text-gray-700 mb-1">
              Vivienda *
            </label>
            {cargandoViviendas ? (
              <p className="text-sm text-gray-400">Cargando viviendas…</p>
            ) : (
              <select
                id="vivienda"
                value={viviendaId}
                onChange={(e) => setViviendaId(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
              >
                <option value="">Selecciona tu vivienda</option>
                {viviendas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.referencia}
                    {v._registrados > 0 ? ` (${v._registrados} registrado/s)` : ''}
                  </option>
                ))}
              </select>
            )}
            {erroresCampo.vivienda && <p className="text-sm text-red-600 mt-1">{erroresCampo.vivienda}</p>}
          </div>

          {/* Nivel de pádel */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Nivel de pádel <span className="text-gray-400 font-normal">(opcional)</span>
            </p>
            <div className="space-y-2">
              {NIVELES_PADEL.map((n) => (
                <label key={n.valor} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="nivelPadel"
                    value={n.valor}
                    checked={nivelPadel === n.valor}
                    onChange={(e) => setNivelPadel(e.target.value as NivelPadel)}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">{n.etiqueta}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Privacidad */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={privacidad}
                onChange={(e) => setPrivacidad(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-teal-600 focus:ring-teal-500 rounded"
              />
              <span className="text-sm text-gray-700">
                He leído y acepto la{' '}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 underline"
                >
                  política de privacidad
                </a>{' '}
                *
              </span>
            </label>
            {erroresCampo.privacidad && <p className="text-sm text-red-600 mt-1">{erroresCampo.privacidad}</p>}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full h-12 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {enviando ? 'Guardando…' : 'Completar registro'}
          </button>
        </form>
      </div>
    </main>
  )
}
