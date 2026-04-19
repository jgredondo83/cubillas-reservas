import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Admin() {
  const { perfil, signOut } = useAuth()

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Panel de administración</h1>
        <p className="text-gray-500 mb-8">En construcción</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <p className="text-gray-600 text-sm">
            Hola, {perfil?.nombre}. Este panel estará disponible próximamente.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link to="/" className="text-sm text-teal-600">Inicio</Link>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  )
}
