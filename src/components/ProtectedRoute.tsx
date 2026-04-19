import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { RolUsuario } from '../types/database'

interface Props {
  children: React.ReactNode
  requierePerfil?: boolean
  rolesPermitidos?: RolUsuario[]
}

export default function ProtectedRoute({ children, requierePerfil = true, rolesPermitidos }: Props) {
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

  if (rolesPermitidos && perfil && !rolesPermitidos.includes(perfil.rol)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
