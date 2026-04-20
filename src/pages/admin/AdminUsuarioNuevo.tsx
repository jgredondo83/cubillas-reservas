import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { crearUsuarioAdmin } from '../../lib/api'
import type { RolUsuario } from '../../types/database'

export default function AdminUsuarioNuevo() {
  const navigate = useNavigate()
  const tema = useTemaAdmin()
  const { perfil } = useAuth()
  const esSuper = perfil?.rol === 'super_admin'

  const [viviendas, setViviendas] = useState<{ id: string; referencia: string }[]>([])
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [alias, setAlias] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [viviendaId, setViviendaId] = useState('')
  const [rol, setRol] = useState<RolUsuario>('vecino')
  const [activar, setActivar] = useState(true)

  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('viviendas')
      .select('id, referencia')
      .order('referencia')
      .then(({ data }) => {
        if (data) setViviendas(data)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombre.trim() || !apellidos.trim() || !telefono.trim() || !email.trim() || !viviendaId) {
      setError('Nombre, apellidos, teléfono, email y vivienda son obligatorios')
      return
    }

    setCargando(true)
    const { error: err } = await crearUsuarioAdmin({
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      alias: alias.trim() || undefined,
      telefono: telefono.trim(),
      email: email.trim(),
      vivienda_id: viviendaId,
      rol,
      activar,
    })

    if (err) {
      setError(err)
      setCargando(false)
    } else {
      navigate('/admin/usuarios')
    }
  }

  return (
    <AdminLayout titulo="Crear usuario">
      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Nombre *</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Apellidos *</label>
              <input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Alias</label>
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Teléfono *</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-600 block mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Necesario para que el vecino pueda acceder a la app. Si no tiene, crea una cuenta personal o usa la del hijo/cuidador.
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Vivienda *</label>
              <select
                value={viviendaId}
                onChange={(e) => setViviendaId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Seleccionar...</option>
                {viviendas.map((v) => (
                  <option key={v.id} value={v.id}>{v.referencia}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as RolUsuario)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="vecino">Vecino</option>
                <option value="guarda">Guarda</option>
                {esSuper && <option value="admin">Admin</option>}
                {esSuper && <option value="super_admin">Super Admin</option>}
                <option value="lectura">Lectura</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={activar}
                onChange={(e) => setActivar(e.target.checked)}
                className="rounded border-gray-300"
              />
              Activar cuenta directamente
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-6">
              Si se marca, el usuario queda en estado "activo" y puede reservar inmediatamente. Si no, queda como "pendiente" hasta que un admin lo verifique.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              to="/admin/usuarios"
              className="flex-1 h-10 flex items-center justify-center border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={cargando}
              className={`flex-1 h-10 rounded-lg text-sm text-white disabled:opacity-50 ${tema.btnPrimario} ${tema.btnPrimarioHover}`}
            >
              {cargando ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
