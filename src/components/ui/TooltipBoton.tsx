import { useState, useRef, useEffect } from 'react'

interface Props {
  texto: string
  children: React.ReactNode
  visible: boolean
  className?: string
}

export default function TooltipBoton({ texto, children, visible, className = '' }: Props) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [abierto])

  if (!visible) {
    return <div className={`relative ${className}`}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
      onClick={(e) => {
        e.stopPropagation()
        setAbierto((v) => !v)
      }}
    >
      {children}
      {abierto && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-slate-100 text-xs rounded-lg shadow-lg whitespace-nowrap border border-slate-700 z-50 pointer-events-none">
          {texto}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  )
}
