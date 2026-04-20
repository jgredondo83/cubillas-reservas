import { useState, useRef, useEffect } from 'react'

interface Accion {
  label: string
  onClick: () => void
  destructivo?: boolean
  oculto?: boolean
}

interface Props {
  acciones: Accion[]
}

export default function DropdownAcciones({ acciones }: Props) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [abierto])

  const visibles = acciones.filter((a) => !a.oculto)
  if (visibles.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        ⋯
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] z-40">
          {visibles.map((a, i) => (
            <button
              key={i}
              onClick={() => { a.onClick(); setAbierto(false) }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                a.destructivo ? 'text-red-600' : 'text-gray-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
