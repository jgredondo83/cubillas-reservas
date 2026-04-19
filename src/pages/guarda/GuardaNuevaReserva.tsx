import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Reservar from '../Reservar'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

interface VecinoBuscado {
  id: string
  nombre: string
  apellidos: string
  telefono: string
  vivienda_referencia: string
}

export default function GuardaNuevaReserva() {
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

      // Buscar por nombre, apellidos, alias o referencia vivienda
      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre, apellidos, telefono, viviendas(referencia)')
        .eq('comunidad_id', COMUNIDAD_ID)
        .or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%,alias.ilike.%${q}%`)
        .limit(10)

      // Si no hay resultados por nombre, intentar por referencia vivienda
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
        // Buscar por vivienda
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

  // Si hay vecino seleccionado, mostrar wizard de reservas
  if (vecinoSeleccionado) {
    return (
      <Reservar
        usuarioObjetivo={{
          id: vecinoSeleccionado.id,
          nombre: vecinoSeleccionado.nombre,
          apellidos: vecinoSeleccionado.apellidos,
        }}
        rutaRetorno="/guarda/hoy"
      />
    )
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-slate-50 font-bold text-lg">Nueva reserva</h1>
          <Link to="/guarda/hoy" className="text-sm text-slate-400 hover:text-slate-200">
            ← Volver
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-slate-400 text-sm mb-4">Busca al vecino por nombre, apellidos o vivienda:</p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej: García, B1-2A..."
          autoFocus
          className="w-full h-14 px-4 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 text-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
        />

        {buscando && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-3 border-slate-700 border-t-teal-400 rounded-full animate-spin" />
          </div>
        )}

        {!buscando && resultados.length > 0 && (
          <div className="mt-4 space-y-2">
            {resultados.map((v) => (
              <button
                key={v.id}
                onClick={() => setVecinoSeleccionado(v)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-teal-500 transition-colors"
              >
                <p className="font-medium text-slate-100">
                  {v.nombre} {v.apellidos} · {v.vivienda_referencia}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{v.telefono}</p>
              </button>
            ))}
          </div>
        )}

        {!buscando && query.trim().length >= 2 && resultados.length === 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center mt-4">
            <p className="text-slate-400">No se encontraron vecinos</p>
          </div>
        )}
      </div>
    </main>
  )
}
