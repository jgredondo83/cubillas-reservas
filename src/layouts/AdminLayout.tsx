import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTemaAdmin } from '../hooks/useTemaAdmin'

interface Props {
  children: React.ReactNode
  titulo?: string
}

interface NavItem {
  label: string
  path: string
  icon: string
  activo: boolean
  soloSuper?: boolean
}

const SECCIONES: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: '📊', activo: true },
  { label: 'Usuarios', path: '/admin/usuarios', icon: '👥', activo: true },
  { label: 'Viviendas', path: '/admin/viviendas', icon: '🏠', activo: true },
  { label: 'Reservas', path: '/admin/reservas', icon: '📅', activo: true },
  { label: 'No presentados', path: '/admin/no-presentados', icon: '⚠️', activo: true },
  { label: 'Bloqueos', path: '/admin/bloqueos', icon: '🚫', activo: false },
  { label: 'Avisos', path: '/admin/avisos', icon: '📢', activo: false },
  { label: 'Recursos', path: '/admin/recursos', icon: '🏸', activo: false },
  { label: 'Textos', path: '/admin/textos', icon: '📝', activo: true },
  { label: 'Logs', path: '/admin/logs', icon: '📋', activo: false },
  { label: 'Test emails', path: '/admin/test-emails', icon: '📧', activo: true, soloSuper: true },
]

export default function AdminLayout({ children, titulo }: Props) {
  const { perfil, signOut } = useAuth()
  const tema = useTemaAdmin()
  const location = useLocation()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  const esSuper = perfil?.rol === 'super_admin'

  function esActivo(path: string) {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  const sidebar = (
    <nav className="py-4 space-y-1 px-3">
      {SECCIONES.map((s) => {
        // Items solo visibles para super_admin
        if (s.soloSuper && !esSuper) return null

        const activo = esActivo(s.path)
        if (!s.activo) {
          return (
            <div
              key={s.path}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-default"
            >
              <span>{s.icon}</span>
              <span className="text-sm">{s.label}</span>
              <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Próx.</span>
            </div>
          )
        }

        return (
          <Link
            key={s.path}
            to={s.path}
            onClick={() => setSidebarAbierto(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activo
                ? `${tema.sidebarActivo} text-white font-medium`
                : `${tema.sidebarTexto} hover:bg-white/10`
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar desktop */}
      <aside className={`hidden md:flex md:flex-col md:w-56 ${tema.sidebar} border-r border-white/10`}>
        <div className="px-4 py-4 border-b border-white/10">
          <p className={`font-bold ${tema.sidebarTexto}`}>
            {esSuper ? 'Super Admin' : 'Admin'}
          </p>
          <p className="text-xs text-gray-400 truncate">{perfil?.nombre} {perfil?.apellidos}</p>
        </div>
        <div className="flex-1 overflow-y-auto">{sidebar}</div>
        <div className="px-4 py-3 border-t border-white/10">
          <button onClick={signOut} className="text-xs text-gray-400 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarAbierto(false)} />
          <aside className={`absolute left-0 top-0 bottom-0 w-64 ${tema.sidebar} shadow-xl`}>
            <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
              <p className={`font-bold ${tema.sidebarTexto}`}>
                {esSuper ? 'Super Admin' : 'Admin'}
              </p>
              <button onClick={() => setSidebarAbierto(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="overflow-y-auto">{sidebar}</div>
            <div className="px-4 py-3 border-t border-white/10">
              <button onClick={signOut} className="text-xs text-gray-400 hover:text-white transition-colors">
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`${tema.headerBg} ${tema.headerText} px-4 py-3 shadow-sm`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarAbierto(true)}
              className="md:hidden text-white text-xl"
            >
              ☰
            </button>
            <h1 className="text-lg font-bold truncate">{titulo || 'Panel de administración'}</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
