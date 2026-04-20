const COLORES_USUARIO: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-500',
  bloqueado: 'bg-red-100 text-red-700',
}

const COLORES_RESERVA: Record<string, string> = {
  confirmada: 'bg-green-100 text-green-700',
  pendiente_pago: 'bg-amber-100 text-amber-700',
  pagado: 'bg-fuchsia-100 text-fuchsia-800',
  cancelada: 'bg-gray-100 text-gray-500',
  completada: 'bg-blue-100 text-blue-700',
  no_presentado: 'bg-red-100 text-red-700',
  pendiente_no_presentado: 'bg-amber-100 text-amber-700',
}

const TEXTOS: Record<string, string> = {
  pendiente: 'Pendiente',
  activo: 'Activo',
  inactivo: 'Inactivo',
  bloqueado: 'Bloqueado',
  confirmada: 'Confirmada',
  pendiente_pago: 'Pte. pago',
  pagado: 'Pagado',
  cancelada: 'Cancelada',
  completada: 'Completada',
  no_presentado: 'No presentado',
  pendiente_no_presentado: 'Pte. revisar',
}

interface Props {
  estado: string
  tipo?: 'usuario' | 'reserva'
}

export default function BadgeEstado({ estado, tipo = 'usuario' }: Props) {
  const colores = tipo === 'reserva' ? COLORES_RESERVA : COLORES_USUARIO
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colores[estado] || 'bg-gray-100 text-gray-500'}`}>
      {TEXTOS[estado] || estado}
    </span>
  )
}
