import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { perfil, signOut } = useAuth()

  if (!perfil) return null

  return (
    <main className="min-h-screen bg-teal-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-teal-700 mb-4">
          Hola, {perfil.nombre}
        </h1>

        {perfil.estado === 'pendiente' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-lg mb-4">
            Tu perfil está pendiente de verificación por un administrador, pero ya puedes reservar.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-6">
          <p className="text-gray-600">
            Aquí estará tu dashboard de reservas (día 3).
          </p>
        </div>

        <button
          onClick={signOut}
          className="mt-6 w-full h-12 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
