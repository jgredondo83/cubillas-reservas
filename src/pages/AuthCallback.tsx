import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Usuario } from '../types/database'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function procesarAuth() {
      try {
        // 1. Si viene ?code=xxx (magic link / PKCE)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
          if (codeError) {
            console.error('Error intercambiando código:', codeError)
            if (!cancelado) navigate('/login', { replace: true })
            return
          }
        }

        // 2. Intentar obtener session (cubre hash de OAuth implícito también)
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          if (!cancelado) await redirigirConPerfil(session.user.id)
          return
        }

        // 3. Si no hay session aún, esperar onAuthStateChange con timeout
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (evento, s) => {
            if (cancelado) return
            if (evento === 'SIGNED_IN' && s) {
              subscription.unsubscribe()
              await redirigirConPerfil(s.user.id)
            }
          }
        )

        // Timeout de 3 segundos
        setTimeout(() => {
          if (cancelado) return
          subscription.unsubscribe()
          // Comprobar una última vez
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (cancelado) return
            if (s) {
              redirigirConPerfil(s.user.id)
            } else {
              navigate('/login', { replace: true })
            }
          })
        }, 3000)
      } catch (err) {
        console.error('Error en AuthCallback:', err)
        if (!cancelado) {
          setError('Error al completar el acceso')
          setTimeout(() => navigate('/login', { replace: true }), 2000)
        }
      }
    }

    async function redirigirConPerfil(userId: string) {
      // Limpiar URL
      window.history.replaceState(null, '', '/auth/callback')

      const { data } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if ((data as Usuario | null)) {
        navigate('/', { replace: true })
      } else {
        navigate('/completar-registro', { replace: true })
      }
    }

    procesarAuth()

    return () => { cancelado = true }
  }, [navigate])

  return (
    <main className="min-h-screen bg-teal-50 flex flex-col items-center justify-center gap-3">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-teal-600">Completando acceso…</p>
        </>
      )}
    </main>
  )
}
