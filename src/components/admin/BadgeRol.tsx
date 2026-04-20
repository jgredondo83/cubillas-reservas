import type { RolUsuario } from '../../types/database'

const COLORES: Record<RolUsuario, string> = {
  super_admin: 'bg-violet-100 text-violet-700',
  admin: 'bg-indigo-100 text-indigo-700',
  guarda: 'bg-slate-100 text-slate-700',
  vecino: 'bg-teal-100 text-teal-700',
  lectura: 'bg-gray-100 text-gray-600',
}

const TEXTOS: Record<RolUsuario, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  guarda: 'Guarda',
  vecino: 'Vecino',
  lectura: 'Lectura',
}

export default function BadgeRol({ rol }: { rol: RolUsuario }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLORES[rol] || 'bg-gray-100 text-gray-600'}`}>
      {TEXTOS[rol] || rol}
    </span>
  )
}
