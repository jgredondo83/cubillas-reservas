import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
  requierePerfil?: boolean
}

export default function ProtectedRoute({ children, requierePerfil = true }: Props) {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <main className="min-h-screen bg-teal-50 flex items-center justify-center">
        <p className="text-teal-600">Cargando…</p>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requierePerfil && !perfil) {
    return <Navigate to="/completar-registro" replace />
  }

  return <>{children}</>
}
