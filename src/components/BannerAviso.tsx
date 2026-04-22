import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'

interface Aviso {
  id: string
  tipo: 'info' | 'advertencia' | 'urgente'
  titulo: string
  contenido: string
  fecha_inicio: string | null
  fecha_fin: string | null
}

const ALLOWED_TAGS = ['strong', 'em', 'br', 'a']
const ALLOWED_ATTR = ['href', 'target', 'rel']

const ESTILOS: Record<string, { fondo: string; icono: string }> = {
  info:        { fondo: 'bg-blue-50 border-blue-200 text-blue-900',   icono: 'ℹ️' },
  advertencia: { fondo: 'bg-amber-50 border-amber-200 text-amber-900', icono: '⚠️' },
  urgente:     { fondo: 'bg-red-50 border-red-200 text-red-900',       icono: '🚨' },
}

function claveLocalStorage(): string {
  const hoy = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `aviso_cerrado_${hoy}`
}

export default function BannerAviso() {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    async function cargar() {
      const ahora = new Date().toISOString()

      // Filtro de fechas: fecha_inicio <= ahora O NULL, fecha_fin >= ahora O NULL
      const { data } = await supabase
        .from('avisos')
        .select('id, tipo, titulo, contenido, fecha_inicio, fecha_fin')
        .eq('activo', true)
        .or(`fecha_inicio.is.null,fecha_inicio.lte.${ahora}`)
        .or(`fecha_fin.is.null,fecha_fin.gte.${ahora}`)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        // Comprobar si ya fue cerrado hoy
        const idCerradoHoy = localStorage.getItem(claveLocalStorage())
        if (idCerradoHoy === data.id) {
          setCerrado(true)
        }
        setAviso(data as Aviso)
      }
    }
    cargar()
  }, [])

  function cerrar() {
    if (!aviso) return
    localStorage.setItem(claveLocalStorage(), aviso.id)
    setCerrado(true)
  }

  if (!aviso || cerrado) return null

  const estilo = ESTILOS[aviso.tipo] ?? ESTILOS.info
  const htmlSeguro = DOMPurify.sanitize(aviso.contenido, { ALLOWED_TAGS, ALLOWED_ATTR })

  return (
    <div className={`border rounded-xl px-4 py-3 mb-4 flex items-start gap-3 ${estilo.fondo}`}>
      <span className="text-lg shrink-0 mt-0.5">{estilo.icono}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{aviso.titulo}</p>
        {htmlSeguro && (
          <div
            className="text-sm mt-0.5 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlSeguro }}
          />
        )}
      </div>
      <button
        onClick={cerrar}
        aria-label="Cerrar aviso"
        className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  )
}
