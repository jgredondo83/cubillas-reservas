import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { supabase } from '../../lib/supabase'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'
import Reservar from '../Reservar'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

interface VecinoBuscado {
  id: string
  nombre: string
  apellidos: string
  telefono: string
  vivienda_referencia: string
}

export default function AdminReservaNueva() {
  const tema = useTemaAdmin()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<VecinoBuscado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [vecinoSeleccionado, setVecinoSeleccionado] = useState<VecinoBuscado | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResultados([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const q = query.trim()

      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre, apellidos, telefono, viviendas(referencia)')
        .eq('comunidad_id', COMUNIDAD_ID)
        .or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%,alias.ilike.%${q}%`)
        .limit(10)

      let resultadosFinal: VecinoBuscado[] = []

      if (data && data.length > 0) {
        resultadosFinal = data.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          apellidos: u.apellidos,
          telefono: u.telefono,
          vivienda_referencia: ((u.viviendas as unknown as { referencia: string }) || { referencia: '' }).referencia,
        }))
      } else {
        const { data: porVivienda } = await supabase
          .from('usuarios')
          .select('id, nombre, apellidos, telefono, viviendas!inner(referencia)')
          .eq('comunidad_id', COMUNIDAD_ID)
          .ilike('viviendas.referencia', `%${q}%`)
          .limit(10)

        if (porVivienda) {
          resultadosFinal = porVivienda.map((u) => ({
            id: u.id,
            nombre: u.nombre,
            apellidos: u.apellidos,
            telefono: u.telefono,
            vivienda_referencia: ((u.viviendas as unknown as { referencia: string }) || { referencia: '' }).referencia,
          }))
        }
      }

      setResultados(resultadosFinal)
      setBuscando(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  if (vecinoSeleccionado) {
    return (
      <Reservar
        usuarioObjetivo={{
          id: vecinoSeleccionado.id,
          nombre: vecinoSeleccionado.nombre,
          apellidos: vecinoSeleccionado.apellidos,
        }}
        rutaRetorno="/admin/reservas"
        callerRol="admin"
      />
    )
  }

  return (
    <AdminLayout titulo="Nueva reserva">
      <div className="max-w-lg">
        <p className="text-sm text-gray-500 mb-4">Busca al vecino por nombre, apellidos o vivienda:</p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej: Garcia, B1-2A..."
          autoFocus
          className="w-full h-12 px-4 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />

        {buscando && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {!buscando && resultados.length > 0 && (
          <div className="mt-4 space-y-2">
            {resultados.map((v) => (
              <button
                key={v.id}
                onClick={() => setVecinoSeleccionado(v)}
                className={`w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-400 transition-colors`}
              >
                <p className="font-medium text-gray-800">
                  {v.nombre} {v.apellidos} · {v.vivienda_referencia}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{v.telefono}</p>
              </button>
            ))}
          </div>
        )}

        {!buscando && query.trim().length >= 2 && resultados.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center mt-4">
            <p className="text-gray-400">No se encontraron vecinos</p>
          </div>
        )}

        <Link to="/admin/reservas" className={`inline-block mt-6 text-sm ${tema.acento} hover:underline`}>
          ← Volver a reservas
        </Link>
      </div>
    </AdminLayout>
  )
}
