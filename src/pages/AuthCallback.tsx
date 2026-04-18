import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
  const { user, perfil, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (perfil) {
      navigate('/', { replace: true })
    } else {
      navigate('/completar-registro', { replace: true })
    }
  }, [user, perfil, loading, navigate])

  return (
    <main className="min-h-screen bg-teal-50 flex items-center justify-center">
      <p className="text-teal-600 text-lg">Cargando…</p>
    </main>
  )
}
