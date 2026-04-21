import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'

type TipoEmail = 'simple' | 'confirmada' | 'recordatorio' | 'cancelada'

interface Resultado {
  ok: boolean
  mensaje: string
  tipo: TipoEmail
}

const BOTONES: { tipo: TipoEmail; label: string; descripcion: string; icono: string }[] = [
  {
    tipo: 'simple',
    label: 'Email de prueba simple',
    descripcion: '"Todo funciona correctamente"',
    icono: '✉️',
  },
  {
    tipo: 'confirmada',
    label: 'Confirmación de reserva',
    descripcion: 'Pista de Pádel 1 — datos ficticios',
    icono: '✅',
  },
  {
    tipo: 'recordatorio',
    label: 'Recordatorio 1h antes',
    descripcion: 'Pista de Tenis — datos ficticios',
    icono: '🔔',
  },
  {
    tipo: 'cancelada',
    label: 'Reserva cancelada',
    descripcion: 'Club Social 6h — cancelada por administración',
    icono: '❌',
  },
]

export default function AdminTestEmails() {
  const { user } = useAuth()
  const tema = useTemaAdmin()
  const [destinatario, setDestinatario] = useState(user?.email ?? '')
  const [enviando, setEnviando] = useState<TipoEmail | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function enviar(tipo: TipoEmail) {
    if (!destinatario || !destinatario.includes('@')) {
      setResultado({ ok: false, mensaje: 'Introduce un email válido', tipo })
      return
    }
    setEnviando(tipo)
    setResultado(null)
    try {
      const { data, error } = await supabase.functions.invoke('test-emails', {
        body: { tipo, destinatario },
      })
      if (error || !data?.ok) {
        setResultado({ ok: false, mensaje: data?.error ?? error?.message ?? 'Error desconocido', tipo })
      } else {
        setResultado({ ok: true, mensaje: `Email enviado a ${destinatario}`, tipo })
      }
    } catch (err) {
      setResultado({ ok: false, mensaje: String(err), tipo })
    } finally {
      setEnviando(null)
    }
  }

  return (
    <AdminLayout titulo="Test de emails">
      <div className="max-w-2xl space-y-6">

        {/* Cabecera */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Probar envío de emails</h2>
          <p className="text-sm text-gray-500">
            Solo <span className="font-medium text-violet-600">super_admin</span> puede usar esta herramienta.
            Útil para verificar que Brevo funciona correctamente y previsualizar las plantillas.
          </p>
        </div>

        {/* Destinatario */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destinatario
          </label>
          <input
            type="email"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="email@ejemplo.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Por defecto tu email. Puedes cambiarlo para probar envíos a otras cuentas.
          </p>
        </div>

        {/* Botones */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tipos de email</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BOTONES.map((b) => {
              const esteEnviando = enviando === b.tipo
              return (
                <button
                  key={b.tipo}
                  onClick={() => enviar(b.tipo)}
                  disabled={enviando !== null}
                  className={`flex items-start gap-3 p-4 border rounded-xl text-left transition-all
                    ${enviando !== null
                      ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                      : `border-gray-200 hover:border-violet-300 hover:bg-violet-50 cursor-pointer bg-white`
                    }`}
                >
                  <span className="text-xl mt-0.5 shrink-0">
                    {esteEnviando ? (
                      <span className={`inline-block h-5 w-5 border-2 border-gray-300 rounded-full animate-spin ${tema.acento} border-t-current`} />
                    ) : b.icono}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{b.descripcion}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              resultado.ok
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <span className="text-lg shrink-0">{resultado.ok ? '✅' : '❌'}</span>
            <div>
              <p className={`text-sm font-medium ${resultado.ok ? 'text-green-800' : 'text-red-800'}`}>
                {resultado.mensaje}
              </p>
              <p className={`text-xs mt-0.5 ${resultado.ok ? 'text-green-600' : 'text-red-500'}`}>
                Tipo: <span className="font-mono">{resultado.tipo}</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
