import { useAuth } from './useAuth'

interface TemaAdmin {
  headerBg: string
  headerText: string
  btnPrimario: string
  btnPrimarioHover: string
  acento: string
  acentoClaro: string
  sidebar: string
  sidebarActivo: string
  sidebarTexto: string
  badge: string
}

const TEMA_ADMIN: TemaAdmin = {
  headerBg: 'bg-indigo-800',
  headerText: 'text-white',
  btnPrimario: 'bg-indigo-600',
  btnPrimarioHover: 'hover:bg-indigo-500',
  acento: 'text-indigo-600',
  acentoClaro: 'text-indigo-400',
  sidebar: 'bg-indigo-900',
  sidebarActivo: 'bg-indigo-700',
  sidebarTexto: 'text-indigo-100',
  badge: 'bg-indigo-100 text-indigo-700',
}

const TEMA_SUPER_ADMIN: TemaAdmin = {
  headerBg: 'bg-violet-900',
  headerText: 'text-white',
  btnPrimario: 'bg-violet-700',
  btnPrimarioHover: 'hover:bg-violet-600',
  acento: 'text-violet-600',
  acentoClaro: 'text-violet-400',
  sidebar: 'bg-violet-950',
  sidebarActivo: 'bg-violet-800',
  sidebarTexto: 'text-violet-100',
  badge: 'bg-violet-100 text-violet-700',
}

export function useTemaAdmin(): TemaAdmin {
  const { perfil } = useAuth()
  return perfil?.rol === 'super_admin' ? TEMA_SUPER_ADMIN : TEMA_ADMIN
}
