import { useState } from 'react'

interface Props {
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  requiereMotivo?: boolean
  notaOpcional?: boolean
  destructivo?: boolean
  cargando?: boolean
  onConfirmar: (motivo?: string) => void
  onCancelar: () => void
}

export default function ModalConfirmacion({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  requiereMotivo = false,
  notaOpcional = false,
  destructivo = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirmar() {
    if (requiereMotivo && !motivo.trim()) {
      setError('El motivo es obligatorio')
      return
    }
    onConfirmar(motivo || undefined)
  }

  const btnClase = destructivo
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-indigo-600 hover:bg-indigo-500 text-white'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-lg">
        <h2 className="font-bold text-gray-800 mb-2">{titulo}</h2>
        <p className="text-sm text-gray-500 mb-4">{mensaje}</p>

        {(requiereMotivo || notaOpcional) && (
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={requiereMotivo ? 'Motivo (obligatorio)' : 'Nota opcional…'}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-3"
          />
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 h-10 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            {textoCancelar}
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cargando}
            className={`flex-1 h-10 rounded-lg text-sm disabled:opacity-50 transition-colors ${btnClase}`}
          >
            {cargando ? 'Procesando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
