import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import ModalConfirmacion from '../../components/admin/ModalConfirmacion'
import { marcarAsistencia, cancelarReserva } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { formatoFechaCorta, formatoHoraDesdeDate } from '../../lib/fechas'

type Accion = 'no_presentado' | 'presentado' | 'deshacer' | 'cancelar'

interface UsuarioDetalle {
  nombre: string
  apellidos: string
  telefono: string
  no_presentado_count_30d: number
  viviendas: { referencia: string } | null
}

interface ReservaNP {
  id: string
  inicio: string
  fin: string
  usuario_id: string | null
  recursos: { nombre: string; tipo: string } | null
  usuarios: UsuarioDetalle | null
}

interface EstadoModal {
  reserva: ReservaNP
  accion: Accion
}

export default function AdminNoPresentados() {
  const [reservas, setReservas] = useState<ReservaNP[]>([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState<EstadoModal | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('reservas')
      .select(`
        id, inicio, fin, usuario_id,
        recursos(nombre, tipo),
        usuarios!reservas_usuario_id_fkey(nombre, apellidos, telefono, no_presentado_count_30d, viviendas(referencia))
      `)
      .eq('estado', 'pendiente_no_presentado')
      .not('usuario_id', 'is', null)
      .order('inicio', { ascending: true })

    setReservas((data as unknown as ReservaNP[]) ?? [])
    setCargando(false)
  }

  function mostrarToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  async function ejecutarAccion(nota?: string) {
    if (!modal) return
    setProcesando(true)

    if (modal.accion === 'cancelar') {
      const { error } = await cancelarReserva({ reserva_id: modal.reserva.id, motivo: nota })
      setProcesando(false)
      if (error) { mostrarToast('Error: ' + error); return }
      mostrarToast('Reserva cancelada')
    } else {
      const { error, data } = await marcarAsistencia({
        reserva_id: modal.reserva.id,
        resultado: modal.accion,
        nota,
      })
      setProcesando(false)
      if (error) { mostrarToast('Error: ' + error); return }
      if (modal.accion === 'no_presentado' && data?.bloqueado) {
        mostrarToast('No presentado confirmado. El vecino ha sido bloqueado 7 días.')
      } else {
        const textos: Record<Accion, string> = {
          no_presentado: 'No presentado confirmado.',
          presentado: 'Marcado como presentado.',
          deshacer: 'Marca deshecha, reserva restaurada.',
          cancelar: 'Reserva cancelada.',
        }
        mostrarToast(textos[modal.accion])
      }
    }

    setModal(null)
    cargar()
  }

  function configModal(accion: Accion, r: ReservaNP) {
    const nombre = r.usuarios ? `${r.usuarios.nombre} ${r.usuarios.apellidos}` : 'vecino desconocido'
    const recurso = r.recursos?.nombre ?? 'instalación'
    const fecha = `${formatoFechaCorta(r.inicio)} ${formatoHoraDesdeDate(r.inicio)}–${formatoHoraDesdeDate(r.fin)}`

    const configs: Record<Accion, { titulo: string; mensaje: string; textoConfirmar: string; destructivo: boolean }> = {
      no_presentado: {
        titulo: 'Confirmar no presentado',
        mensaje: `Se marcará a ${nombre} como NO PRESENTADO en la reserva de ${recurso} el ${fecha}. Se incrementará su contador y se aplicará bloqueo si alcanza el umbral.`,
        textoConfirmar: 'Confirmar no presentado',
        destructivo: true,
      },
      presentado: {
        titulo: 'Marcar como presentado',
        mensaje: `Se marcará a ${nombre} como PRESENTADO en la reserva de ${recurso} el ${fecha}. La reserva pasará a "completada" sin penalización.`,
        textoConfirmar: 'Marcar presentado',
        destructivo: false,
      },
      deshacer: {
        titulo: 'Deshacer marca',
        mensaje: `Se deshará la marca de pendiente_no_presentado y la reserva de ${nombre} en ${recurso} el ${fecha} volverá a su estado anterior.`,
        textoConfirmar: 'Deshacer',
        destructivo: false,
      },
      cancelar: {
        titulo: 'Cancelar reserva',
        mensaje: `Se cancelará la reserva de ${nombre} en ${recurso} el ${fecha}. Usar solo si la reserva fue cancelada fuera del sistema.`,
        textoConfirmar: 'Cancelar reserva',
        destructivo: true,
      },
    }

    return configs[accion]
  }

  const cfg = modal ? configModal(modal.accion, modal.reserva) : null

  return (
    <AdminLayout titulo="No presentados">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-gray-800">No presentados pendientes de revisar</h2>
          <p className="text-sm text-gray-500 mt-1">
            Reservas con fin en el pasado que no han sido marcadas por el guarda. Revisa y decide si confirmar
            como no presentado (aplica penalización) o marcar como presentado.
          </p>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            {toastMsg}
          </div>
        )}

        {/* Contenido */}
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
          </div>
        ) : reservas.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-2xl mb-2">✨</p>
            <p className="text-gray-500 text-sm">No hay reservas pendientes de revisar. ¡Todo al día!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map((r) => {
              const u = r.usuarios
              const contadorActual = u?.no_presentado_count_30d ?? 0
              const seriaSegundo = contadorActual >= 1

              return (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  {/* Cabecera tarjeta */}
                  <div className="flex flex-wrap items-start gap-2 justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {u ? `${u.nombre} ${u.apellidos}` : <span className="text-gray-400 italic">Usuario eliminado</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {u?.viviendas?.referencia ?? '—'}
                        {u?.telefono ? ` · ${u.telefono}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-700">{r.recursos?.nombre ?? '—'}</p>
                      <p className="text-xs text-gray-400">
                        {formatoFechaCorta(r.inicio)} · {formatoHoraDesdeDate(r.inicio)}–{formatoHoraDesdeDate(r.fin)}
                      </p>
                    </div>
                  </div>

                  {/* Contador + badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">
                      No presentados (30d): <span className="font-semibold text-gray-700">{contadorActual}</span>
                    </span>
                    {seriaSegundo && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                        ⚠️ Este sería su 2.º no presentado → bloqueo 7 días
                      </span>
                    )}
                  </div>

                  {/* Botones */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setModal({ reserva: r, accion: 'no_presentado' })}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
                    >
                      Confirmar no presentado
                    </button>
                    <button
                      onClick={() => setModal({ reserva: r, accion: 'presentado' })}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
                    >
                      Marcar como presentado
                    </button>
                    <button
                      onClick={() => setModal({ reserva: r, accion: 'cancelar' })}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                    >
                      Cancelar reserva
                    </button>
                    <button
                      onClick={() => setModal({ reserva: r, accion: 'deshacer' })}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      Deshacer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && cfg && (
        <ModalConfirmacion
          titulo={cfg.titulo}
          mensaje={cfg.mensaje}
          textoConfirmar={cfg.textoConfirmar}
          destructivo={cfg.destructivo}
          notaOpcional
          cargando={procesando}
          onConfirmar={ejecutarAccion}
          onCancelar={() => setModal(null)}
        />
      )}
    </AdminLayout>
  )
}
