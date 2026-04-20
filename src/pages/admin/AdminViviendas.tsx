import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import ModalConfirmacion from '../../components/admin/ModalConfirmacion'
import DropdownAcciones from '../../components/admin/DropdownAcciones'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import { gestionarVivienda } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import type { Vivienda } from '../../types/database'

type ViviendaConVecinos = Vivienda & { num_vecinos: number }

export default function AdminViviendas() {
  const tema = useTemaAdmin()
  const { perfil: perfilAuth } = useAuth()
  const esSuper = perfilAuth?.rol === 'super_admin'
  const [searchParams] = useSearchParams()
  const [viviendas, setViviendas] = useState<ViviendaConVecinos[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroImpago, setFiltroImpago] = useState(searchParams.get('impago') === 'true')
  const [busqueda, setBusqueda] = useState('')

  // Modal bloquear/desbloquear
  const [viviendaAccion, setViviendaAccion] = useState<Vivienda | null>(null)
  const [accionTipo, setAccionTipo] = useState<'bloquear' | 'desbloquear' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Edición inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editRef, setEditRef] = useState('')
  const [editBloque, setEditBloque] = useState('')
  const [editNumero, setEditNumero] = useState('')
  const [editLetra, setEditLetra] = useState('')

  useEffect(() => {
    cargar()
  }, [filtroImpago])

  async function cargar() {
    setCargando(true)

    // Cargar viviendas
    let query = supabase.from('viviendas').select('*').order('referencia')
    if (filtroImpago) query = query.eq('bloqueada_por_impago', true)
    const { data: vivsData } = await query

    if (!vivsData) {
      setViviendas([])
      setCargando(false)
      return
    }

    // Contar vecinos por vivienda
    const { data: conteos } = await supabase
      .from('usuarios')
      .select('vivienda_id')
      .in('vivienda_id', vivsData.map((v) => v.id))

    const conteoMap: Record<string, number> = {}
    for (const u of conteos || []) {
      conteoMap[u.vivienda_id] = (conteoMap[u.vivienda_id] || 0) + 1
    }

    setViviendas(
      vivsData.map((v) => ({
        ...(v as Vivienda),
        num_vecinos: conteoMap[v.id] || 0,
      }))
    )
    setCargando(false)
  }

  function filtradas() {
    if (!busqueda.trim()) return viviendas
    const q = busqueda.toLowerCase()
    return viviendas.filter(
      (v) =>
        v.referencia.toLowerCase().includes(q) ||
        v.bloque?.toLowerCase().includes(q) ||
        v.numero?.toLowerCase().includes(q)
    )
  }

  async function ejecutarAccion(motivo?: string) {
    if (!viviendaAccion || !accionTipo) return
    setProcesando(true)
    setError(null)

    const { error: err } = await gestionarVivienda({
      vivienda_id: viviendaAccion.id,
      accion: accionTipo,
      motivo,
    })

    if (err) {
      setError(err)
    } else {
      setExito(`Vivienda ${accionTipo === 'bloquear' ? 'bloqueada' : 'desbloqueada'}`)
      cargar()
      setTimeout(() => setExito(null), 3000)
    }

    setViviendaAccion(null)
    setAccionTipo(null)
    setProcesando(false)
  }

  async function guardarEdicion(id: string) {
    setProcesando(true)
    const { error: err } = await supabase
      .from('viviendas')
      .update({
        referencia: editRef.trim(),
        bloque: editBloque.trim() || null,
        numero: editNumero.trim() || null,
        letra: editLetra.trim() || null,
      })
      .eq('id', id)

    if (err) {
      setError('Error al guardar: ' + err.message)
    } else {
      setEditandoId(null)
      cargar()
    }
    setProcesando(false)
  }

  function iniciarEdicion(v: Vivienda) {
    setEditandoId(v.id)
    setEditRef(v.referencia)
    setEditBloque(v.bloque || '')
    setEditNumero(v.numero || '')
    setEditLetra(v.letra || '')
  }

  const lista = filtradas()

  return (
    <AdminLayout titulo="Viviendas">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {exito && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            {exito}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por referencia, bloque…"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filtroImpago}
                onChange={(e) => setFiltroImpago(e.target.checked)}
                className="rounded border-gray-300"
              />
              Solo con impago
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{lista.length} vivienda{lista.length !== 1 ? 's' : ''}</p>
          {esSuper && (
            <Link
              to="/admin/viviendas/nueva"
              className={`px-4 py-2 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
            >
              + Nueva vivienda
            </Link>
          )}
        </div>

        {/* Tabla */}
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
          </div>
        ) : lista.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            No se encontraron viviendas
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Referencia</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Bloque</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Número</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vecinos</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lista.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      {editandoId === v.id ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              value={editRef}
                              onChange={(e) => setEditRef(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 hidden sm:table-cell">
                            <input
                              value={editBloque}
                              onChange={(e) => setEditBloque(e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 hidden sm:table-cell">
                            <input
                              value={editNumero}
                              onChange={(e) => setEditNumero(e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-gray-600">{v.num_vecinos}</td>
                          <td className="px-4 py-2">
                            {v.bloqueada_por_impago ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Impago</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">OK</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditandoId(null)} className="text-xs text-gray-500">Cancelar</button>
                              <button onClick={() => guardarEdicion(v.id)} className={`text-xs ${tema.acento}`}>Guardar</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            <Link to={`/admin/viviendas/${v.id}`} className="hover:underline">{v.referencia}</Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{v.bloque || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{v.numero || '—'}{v.letra || ''}</td>
                          <td className="px-4 py-3 text-gray-600">{v.num_vecinos}</td>
                          <td className="px-4 py-3">
                            {v.bloqueada_por_impago ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Impago</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">OK</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <DropdownAcciones
                              acciones={[
                                { label: 'Editar', onClick: () => iniciarEdicion(v) },
                                {
                                  label: 'Bloquear por impago',
                                  onClick: () => { setViviendaAccion(v); setAccionTipo('bloquear') },
                                  oculto: v.bloqueada_por_impago,
                                  destructivo: true,
                                },
                                {
                                  label: 'Quitar bloqueo',
                                  onClick: () => { setViviendaAccion(v); setAccionTipo('desbloquear') },
                                  oculto: !v.bloqueada_por_impago,
                                },
                              ]}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {viviendaAccion && accionTipo && (
        <ModalConfirmacion
          titulo={accionTipo === 'bloquear' ? 'Bloquear vivienda' : 'Desbloquear vivienda'}
          mensaje={
            accionTipo === 'bloquear'
              ? `¿Bloquear la vivienda ${viviendaAccion.referencia} por impago? Sus vecinos no podrán hacer reservas.`
              : `¿Quitar el bloqueo por impago de la vivienda ${viviendaAccion.referencia}?`
          }
          textoConfirmar={accionTipo === 'bloquear' ? 'Bloquear' : 'Desbloquear'}
          destructivo={accionTipo === 'bloquear'}
          requiereMotivo={accionTipo === 'bloquear'}
          cargando={procesando}
          onConfirmar={ejecutarAccion}
          onCancelar={() => { setViviendaAccion(null); setAccionTipo(null) }}
        />
      )}
    </AdminLayout>
  )
}
