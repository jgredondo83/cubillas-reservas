import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import { crearVivienda } from '../../lib/api'

export default function AdminViviendaNueva() {
  const tema = useTemaAdmin()
  const navigate = useNavigate()

  const [referencia, setReferencia] = useState('')
  const [bloque, setBloque] = useState('')
  const [numero, setNumero] = useState('')
  const [letra, setLetra] = useState('')
  const [planta, setPlanta] = useState('')
  const [notaAdmin, setNotaAdmin] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!referencia.trim()) {
      setError('La referencia es obligatoria')
      return
    }

    setProcesando(true)
    setError(null)

    const { error: err } = await crearVivienda({
      referencia: referencia.trim(),
      bloque: bloque.trim() || undefined,
      numero: numero.trim() || undefined,
      letra: letra.trim() || undefined,
      planta: planta.trim() || undefined,
      nota_admin: notaAdmin.trim() || undefined,
    })

    if (err) {
      setError(err)
      setProcesando(false)
    } else {
      navigate('/admin/viviendas')
    }
  }

  return (
    <AdminLayout titulo="Nueva vivienda">
      <div className="max-w-lg">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-500">Referencia *</label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: B1-2A, P3-1B..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Bloque</label>
              <input
                value={bloque}
                onChange={(e) => setBloque(e.target.value)}
                placeholder="Ej: B1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Planta</label>
              <input
                value={planta}
                onChange={(e) => setPlanta(e.target.value)}
                placeholder="Ej: 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Numero</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej: 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Letra</label>
              <input
                value={letra}
                onChange={(e) => setLetra(e.target.value)}
                placeholder="Ej: A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Nota admin (opcional)</label>
            <textarea
              value={notaAdmin}
              onChange={(e) => setNotaAdmin(e.target.value)}
              rows={2}
              placeholder="Nota interna..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={procesando}
            className={`w-full h-10 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} disabled:opacity-50 transition-colors`}
          >
            {procesando ? 'Creando...' : 'Crear vivienda'}
          </button>
        </form>

        <Link to="/admin/viviendas" className={`inline-block mt-4 text-sm ${tema.acento} hover:underline`}>
          ← Volver a viviendas
        </Link>
      </div>
    </AdminLayout>
  )
}
