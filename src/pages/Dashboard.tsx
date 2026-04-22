import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Reserva, Recurso } from '../types/database'
import {
  formatoFechaCorta,
  formatoHoraDesdeDate,
  emojiRecurso,
} from '../lib/fechas'

interface ReservaConRecurso extends Reserva {
  recursos: Pick<Recurso, 'nombre' | 'tipo'>
}

export default function Dashboard() {
  const { user, perfil, signOut } = useAuth()
  const [proximasReservas, setProximasReservas] = useState<ReservaConRecurso[]>([])
  const [totalProximas, setTotalProximas] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!user) return

    async function cargar() {
      const ahora = new Date().toISOString()

      const { data, count } = await supabase
        .from('reservas')
        .select('*, recursos(nombre, tipo)', { count: 'exact' })
        .eq('usuario_id', user!.id)
        .in('estado', ['confirmada', 'pendiente_pago', 'pagado'])
        .gte('inicio', ahora)
        .order('inicio', { ascending: true })
        .limit(3)

      setProximasReservas((data as ReservaConRecurso[] | null) || [])
      setTotalProximas(count || 0)
      setCargando(false)
    }

    cargar()
  }, [user])

  if (!perfil) return null

  return (
    <main className="min-h-screen bg-teal-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-teal-700 mb-4">
          Hola, {perfil.nombre}
        </h1>

        {perfil.estado === 'pendiente' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-lg mb-4">
            Tu perfil está pendiente de verificación por un administrador, pero ya puedes reservar.
          </div>
        )}

        {/* Botón reservar */}
        <Link
          to="/reservar"
          className="block w-full h-14 bg-teal-600 text-white text-lg font-medium rounded-xl text-center leading-[3.5rem] hover:bg-teal-700 transition-colors mb-6 shadow-sm"
        >
          Reservar
        </Link>

        {/* Próximas reservas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Próximas reservas</h2>
            {totalProximas > 0 && (
              <Link to="/mis-reservas" className="text-sm text-teal-600">Ver todas</Link>
            )}
          </div>

          {cargando ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : proximasReservas.length === 0 ? (
            <div className="bg-white rounded-xl border border-teal-100 p-5 text-center">
              <p className="text-gray-400 text-sm">Sin reservas próximas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proximasReservas.map((r) => (
                <Link
                  key={r.id}
                  to="/mis-reservas"
                  className="block bg-white rounded-xl border border-teal-100 p-3 hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{emojiRecurso(r.recursos.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.recursos.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {formatoFechaCorta(r.inicio)} · {formatoHoraDesdeDate(r.inicio)} - {formatoHoraDesdeDate(r.fin)}
                      </p>
                    </div>
                    {r.estado === 'pendiente_pago' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        Pte. pago
                      </span>
                    )}
                    {r.estado === 'pagado' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 font-medium">
                        Pagado
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {totalProximas > 3 && (
                <Link to="/mis-reservas" className="block text-center text-sm text-teal-600 py-2">
                  +{totalProximas - 3} más
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-teal-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/mis-reservas" className="text-sm text-teal-600">
                Mis reservas
              </Link>
              <Link to="/perfil" className="text-sm text-teal-600">
                Mi perfil
              </Link>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/politica-privacidad" className="text-xs text-gray-400 hover:text-gray-600">
              Política de privacidad
            </Link>
            <Link to="/aviso-legal" className="text-xs text-gray-400 hover:text-gray-600">
              Aviso legal
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
