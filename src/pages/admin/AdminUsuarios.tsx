import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import BadgeEstado from '../../components/admin/BadgeEstado'
import BadgeRol from '../../components/admin/BadgeRol'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import type { Usuario, RolUsuario, EstadoUsuario } from '../../types/database'

const PAGE_SIZE = 20

export default function AdminUsuarios() {
  const tema = useTemaAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [usuarios, setUsuarios] = useState<(Usuario & { vivienda_ref?: string; vivienda_bloqueada?: boolean })[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') || '')
  const [filtroEstado, setFiltroEstado] = useState<EstadoUsuario | ''>(
    (searchParams.get('estado') as EstadoUsuario) || ''
  )
  const [filtroRol, setFiltroRol] = useState<RolUsuario | ''>('')
  const [pagina, setPagina] = useState(0)

  useEffect(() => {
    cargar()
  }, [pagina, filtroEstado, filtroRol])

  async function cargar() {
    setCargando(true)
    let query = supabase
      .from('usuarios')
      .select('*, viviendas(referencia, bloqueada_por_impago)', { count: 'exact' })

    if (filtroEstado) query = query.eq('estado', filtroEstado)
    if (filtroRol) query = query.eq('rol', filtroRol)
    if (busqueda.trim()) {
      const q = `%${busqueda.trim()}%`
      query = query.or(`nombre.ilike.${q},apellidos.ilike.${q},alias.ilike.${q},telefono.ilike.${q}`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1)

    const { data, count } = await query
    setUsuarios(
      (data || []).map((u: Record<string, unknown>) => {
        const viv = u.viviendas as { referencia: string; bloqueada_por_impago: boolean } | null
        return {
          ...(u as unknown as Usuario),
          vivienda_ref: viv?.referencia || '—',
          vivienda_bloqueada: viv?.bloqueada_por_impago ?? false,
        }
      })
    )
    setTotal(count ?? 0)
    setCargando(false)
  }

  function buscar() {
    setPagina(0)
    const params: Record<string, string> = {}
    if (busqueda) params.q = busqueda
    if (filtroEstado) params.estado = filtroEstado
    setSearchParams(params)
    cargar()
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE)

  return (
    <AdminLayout titulo="Usuarios">
      <div className="space-y-4">
        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                placeholder="Buscar por nombre, apellidos, alias o teléfono…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value as EstadoUsuario | ''); setPagina(0) }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
            <select
              value={filtroRol}
              onChange={(e) => { setFiltroRol(e.target.value as RolUsuario | ''); setPagina(0) }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todos los roles</option>
              <option value="vecino">Vecino</option>
              <option value="guarda">Guarda</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
              <option value="lectura">Lectura</option>
            </select>
            <button
              onClick={buscar}
              className={`px-4 py-2 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Botón crear */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{total} usuario{total !== 1 ? 's' : ''}</p>
          <Link
            to="/admin/usuarios/nuevo"
            className={`px-4 py-2 rounded-lg text-sm text-white ${tema.btnPrimario} ${tema.btnPrimarioHover} transition-colors`}
          >
            + Crear usuario
          </Link>
        </div>

        {/* Tabla */}
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-gray-200 rounded-full border-t-indigo-600" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            No se encontraron usuarios
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Vivienda</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Teléfono</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <Link to={`/admin/usuarios/${u.id}`} className={`font-medium ${tema.acento} hover:underline`}>
                            {u.nombre} {u.apellidos}
                          </Link>
                          {u.alias && <p className="text-xs text-gray-400">{u.alias}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Link to={`/admin/viviendas/${u.vivienda_id}`} className={`text-gray-600 hover:${tema.acento} hover:underline`}>
                          {u.vivienda_ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{u.telefono}</td>
                      <td className="px-4 py-3"><BadgeRol rol={u.rol} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <BadgeEstado estado={u.estado} />
                          {u.vivienda_bloqueada && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700" title="La vivienda de este usuario está bloqueada por impago. No puede reservar aunque su cuenta esté activa.">Viv. impago</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/usuarios/${u.id}`}
                          className={`text-sm ${tema.acento} hover:underline`}
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setPagina(Math.max(0, pagina - 1))}
                  disabled={pagina === 0}
                  className="text-sm text-gray-600 disabled:text-gray-300"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-gray-500">
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(Math.min(totalPaginas - 1, pagina + 1))}
                  disabled={pagina >= totalPaginas - 1}
                  className="text-sm text-gray-600 disabled:text-gray-300"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
