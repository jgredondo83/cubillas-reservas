import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

const ALLOWED_TAGS = ['strong', 'em', 'br', 'a', 'p', 'ul', 'ol', 'li']
const ALLOWED_ATTR = ['href', 'target', 'rel']

export default function NormasUso() {
  const [contenido, setContenido] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase
      .from('textos_admin')
      .select('contenido')
      .eq('comunidad_id', COMUNIDAD_ID)
      .eq('clave', 'normas_uso')
      .single()
      .then(({ data }) => {
        setContenido(data?.contenido ?? null)
        setCargando(false)
      })
  }, [])

  const htmlSeguro = contenido
    ? DOMPurify.sanitize(contenido, { ALLOWED_TAGS, ALLOWED_ATTR })
    : null

  return (
    <main className="min-h-screen bg-white py-10 px-4">
      <article className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-sm text-teal-600">← Volver</Link>
          <h1 className="text-2xl font-bold text-teal-700 mt-3 mb-1">Normas de uso</h1>
          <p className="text-sm text-gray-400">Parque del Cubillas</p>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : htmlSeguro ? (
          <div
            className="prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlSeguro }}
          />
        ) : (
          <p className="text-gray-400 text-sm">Las normas de uso no están disponibles en este momento.</p>
        )}

        <div className="mt-10 pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link to="/politica-privacidad" className="hover:text-gray-600">Política de privacidad</Link>
          <Link to="/aviso-legal" className="hover:text-gray-600">Aviso legal</Link>
          <Link to="/" className="hover:text-gray-600">Inicio</Link>
        </div>
      </article>
    </main>
  )
}
