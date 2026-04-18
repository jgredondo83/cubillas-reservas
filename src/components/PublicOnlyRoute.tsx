import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
}

export default function PublicOnlyRoute({ children }: Props) {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <main className="min-h-screen bg-teal-50 flex items-center justify-center">
        <p className="text-teal-600">Cargando…</p>
      </main>
    )
  }

  if (user && perfil) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
