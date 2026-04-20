import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import BadgeEstado from '../../components/admin/BadgeEstado'
import BadgeRol from '../../components/admin/BadgeRol'
import ModalConfirmacion from '../../components/admin/ModalConfirmacion'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import { gestionarVivienda } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import type { Vivienda, Usuario } from '../../types/database'

export default function AdminViviendaDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tema = useTemaAdmin()
  const { perfil: perfilAuth } = useAuth()
  const esSuper = perfilAuth?.rol === 'super_admin'

  const [vivienda, setVivienda] = useState<Vivienda | null>(null)
  const [vecinos, setVecinos] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)

  const [accionTipo, setAccionTipo] = useState<'bloquear' | 'desbloquear' | 'eliminar' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')

  useEffect(() => {
    cargar()
  }, [id])

  async function cargar() {
    if (!id) return
    setCargando(true)

    const [{ data: vivData }, { data: vecinosData }] = await Promise.all([
      supabase.from('viviendas').select('*').eq('id', id).single(),
      supabase.from('usuarios').select('*').eq('vivienda_id', id).order('apellidos'),
    ])

    if (vivData) setVivienda(vivData as Vivienda)
    setVecinos((vecinosData || []) as Usuario[])
    setCargando(false)
  }

  async function ejecutarAccion(motivo?: string) {
    if (!vivienda || !accionTipo) return
    setProcesando(true)
    setError(null)

    const { error: err } = await gestionarVivienda({
      vivienda_id: vivienda.id,
      accion: accionTipo,
      motivo,
    })

    if (err) {
      setError(err)
    } else if (accionTipo === 'eliminar') {
      navigate('/admin/viviendas')
      return
    } else {
      setExito(`Vivienda ${accionTipo === 'bloquear' ? 'bloqueada' : 'desbloqueada'}`)
      cargar()
      setTimeout(() => setExito(null), 3000)
    }

    setAccionTipo(null)
    setProcesando(false)
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Vivienda">
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
        </div>
      </AdminLayout>
    )
  }

  if (!vivienda) {
    return (
      <AdminLayout titulo="Vivienda">
        <div className="text-center py-12 text-gray-500">
          Vivienda no encontrada.{' '}
          <Link to="/admin/viviendas" className={tema.acento}>Volver</Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout titulo={`Vivienda ${vivienda.referencia}`}>
      <div className="max-w-2xl space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
        {exito && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{exito}</div>}

        {/* Datos */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Datos de la vivienda</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Referencia</dt>
              <dd className="text-gray-800 font-medium">{vivienda.referencia}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Bloque</dt>
              <dd className="text-gray-800 font-medium">{vivienda.bloque || '---'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Numero</dt>
              <dd className="text-gray-800 font-medium">{vivienda.numero || '---'}{vivienda.letra || ''}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd>
                {vivienda.bloqueada_por_impago ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Impago</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">OK</span>
                )}
              </dd>
            </div>
            {vivienda.motivo_bloqueo && (
              <div className="col-span-2">
                <dt className="text-gray-500">Motivo bloqueo</dt>
                <dd className="text-gray-800 font-medium">{vivienda.motivo_bloqueo}</dd>
              </div>
            )}
          </dl>

          <div className="flex gap-3 mt-4">
            {vivienda.bloqueada_por_impago ? (
              <button
                onClick={() => setAccionTipo('desbloquear')}
                className="px-4 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-500 transition-colors"
              >
                Quitar bloqueo
              </button>
            ) : (
              <button
                onClick={() => setAccionTipo('bloquear')}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Bloquear por impago
              </button>
            )}
            {esSuper && (
              <button
                onClick={() => setAccionTipo('eliminar')}
                className="px-4 py-2 rounded-lg text-sm border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              >
                Eliminar vivienda
              </button>
            )}
          </div>
        </div>

        {/* Vecinos registrados */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Vecinos registrados ({vecinos.length})</h3>
          {vecinos.length === 0 ? (
            <p className="text-sm text-gray-400">Ninguno registrado</p>
          ) : (
            <div className="space-y-2">
              {vecinos.map((v) => (
                <Link
                  key={v.id}
                  to={`/admin/usuarios/${v.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.nombre} {v.apellidos}</p>
                    <p className="text-xs text-gray-400">{v.telefono}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeRol rol={v.rol} />
                    <BadgeEstado estado={v.estado} />
                    {v.estado === 'bloqueado' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Bloq. individual</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link to="/admin/viviendas" className={`text-sm ${tema.acento} hover:underline`}>
          ← Volver a viviendas
        </Link>
      </div>

      {accionTipo === 'bloquear' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h2 className="font-bold text-gray-800 mb-3">Bloquear vivienda por impago: {vivienda.referencia}</h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                Al bloquear esta vivienda, los <strong>{vecinos.length}</strong> vecino{vecinos.length !== 1 ? 's' : ''} registrado{vecinos.length !== 1 ? 's' : ''} no podrán hacer reservas hasta que se desbloquee. Esto no penaliza el contador de no-presentados de los usuarios.
              </p>
            </div>

            {vecinos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Vecinos afectados:</p>
                <ul className="text-sm text-gray-700 space-y-0.5">
                  {vecinos.map((v) => (
                    <li key={v.id}>· {v.nombre} {v.apellidos}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500">Motivo interno (obligatorio)</label>
              <textarea
                value={bloqueoMotivo}
                onChange={(e) => setBloqueoMotivo(e.target.value)}
                rows={2}
                placeholder="Solo visible para admin/super_admin. Los vecinos verán un mensaje genérico."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setAccionTipo(null); setBloqueoMotivo('') }}
                className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { if (bloqueoMotivo.trim()) ejecutarAccion(bloqueoMotivo.trim()) }}
                disabled={procesando || !bloqueoMotivo.trim()}
                className="flex-1 h-10 rounded-lg text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {procesando ? 'Procesando...' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(accionTipo === 'desbloquear' || accionTipo === 'eliminar') && (
        <ModalConfirmacion
          titulo={accionTipo === 'eliminar' ? 'Eliminar vivienda' : 'Desbloquear vivienda'}
          mensaje={
            accionTipo === 'eliminar'
              ? `Vas a eliminar la vivienda ${vivienda.referencia}. Esto no se puede deshacer. ¿Continuar?`
              : `Quitar el bloqueo por impago de la vivienda ${vivienda.referencia}?`
          }
          textoConfirmar={accionTipo === 'eliminar' ? 'Eliminar' : 'Desbloquear'}
          destructivo={accionTipo === 'eliminar'}
          cargando={procesando}
          onConfirmar={ejecutarAccion}
          onCancelar={() => setAccionTipo(null)}
        />
      )}
    </AdminLayout>
  )
}
