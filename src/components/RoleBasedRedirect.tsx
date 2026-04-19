import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Dashboard from '../pages/Dashboard'

export default function RoleBasedRedirect() {
  const { perfil, loading } = useAuth()

  if (loading) return null

  if (!perfil) return <Dashboard />

  switch (perfil.rol) {
    case 'guarda':
      return <Navigate to="/guarda/hoy" replace />
    case 'admin':
    case 'super_admin':
      return <Navigate to="/admin" replace />
    default:
      return <Dashboard />
  }
}
