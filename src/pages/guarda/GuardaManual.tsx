import { useState } from 'react'

// ─── Helpers de estilo ────────────────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-teal-400 mb-4">{children}</h2>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-300 mb-3 leading-relaxed">{children}</p>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-3 ml-1">{children}</ul>
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-300 mb-3 ml-1">{children}</ol>
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-900/30 border border-amber-600/50 p-3 rounded-lg text-amber-200 text-sm mb-3 leading-relaxed">
      ⚠️ {children}
    </div>
  )
}

function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-teal-900/30 border border-teal-600/50 p-3 rounded-lg text-teal-200 text-sm mb-3 leading-relaxed">
      💡 {children}
    </div>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-100 mb-2 mt-4">{children}</h3>
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function Bienvenida() {
  return (
    <div>
      <H2>1. Bienvenida</H2>
      <P>
        Este manual te explica cómo usar el panel del guarda de <strong>Parque del Cubillas Reservas</strong>.
      </P>
      <P>
        Tu función principal es controlar las entradas a las instalaciones: verificar que quien llega tiene una reserva activa
        y marcar su asistencia. También puedes crear reservas de forma manual cuando lo necesites.
      </P>
      <H3>Lo que puedes hacer</H3>
      <Ul>
        <li>Ver las reservas del día de hoy y de cualquier otro día.</li>
        <li>Marcar la asistencia de un vecino cuando llega.</li>
        <li>Cancelar una reserva si es necesario.</li>
        <li>Crear una nueva reserva a nombre de un vecino.</li>
      </Ul>
      <Info>
        El panel está pensado para usarse desde el móvil o desde la tablet de la garita.
      </Info>
    </div>
  )
}

function VerReservasDia() {
  return (
    <div>
      <H2>2. Ver reservas del día</H2>
      <P>
        Al entrar al panel ves directamente las reservas de hoy, ordenadas por hora de inicio.
      </P>
      <H3>Navegar entre días</H3>
      <P>
        Usa los botones <strong>← Anterior</strong> y <strong>Siguiente →</strong> para moverte entre días.
        Si estás en otro día, el botón <strong>Hoy</strong> te devuelve al día actual.
      </P>
      <H3>Qué muestra cada tarjeta</H3>
      <Ul>
        <li><strong>Recurso</strong>: pista de pádel, tenis o club social.</li>
        <li><strong>Hora</strong>: franja reservada (ej. 10:00 – 11:30).</li>
        <li><strong>Vecino</strong>: nombre, apellidos y teléfono.</li>
        <li><strong>Vivienda</strong>: referencia del piso o casa.</li>
        <li><strong>Estado</strong>: confirmada, cancelada o presentado.</li>
      </Ul>
      <Info>
        Si el vecino fue dado de baja por protección de datos, la tarjeta muestra «— Vecino eliminado —» en lugar del nombre.
        La reserva sigue siendo válida; el vecino debe identificarse por la vivienda.
      </Info>
    </div>
  )
}

function MarcarAsistencia() {
  return (
    <div>
      <H2>3. Marcar asistencia</H2>
      <P>
        Cuando un vecino llega a la instalación, busca su reserva en la lista del día y pulsa <strong>Presentado</strong>.
      </P>
      <Ol>
        <li>Localiza la tarjeta de la reserva (por nombre o recurso).</li>
        <li>Pulsa el botón verde <strong>Presentado</strong>.</li>
        <li>La tarjeta cambia de color y muestra el estado «Presentado» de forma inmediata.</li>
      </Ol>
      <H3>Deshacer un presentado</H3>
      <P>
        Si te equivocas, pulsa <strong>Desmarcar</strong> para volver al estado anterior.
        El cambio se registra con tu nombre y la hora exacta.
      </P>
      <Aviso>
        El sistema de no-presentados es automático: si una reserva pasada no tiene asistencia marcada, el vecino acumula un
        no-presentado. <strong>2 no-presentados en 30 días bloquean la cuenta durante 7 días.</strong> Por eso es importante marcar siempre la asistencia.
      </Aviso>
    </div>
  )
}

function CancelarReserva() {
  return (
    <div>
      <H2>4. Cancelar reserva</H2>
      <P>
        Puedes cancelar cualquier reserva confirmada desde la tarjeta del día.
      </P>
      <Ol>
        <li>Localiza la reserva en la lista.</li>
        <li>Pulsa el botón <strong>Cancelar</strong> (en rojo).</li>
        <li>Aparece un mensaje de confirmación con el nombre del vecino y la franja. Confírmalo.</li>
        <li>La reserva queda cancelada y la franja queda libre.</li>
      </Ol>
      <Info>
        El vecino no recibe notificación automática al cancelar desde el panel del guarda. Si la cancelación es por incidencia,
        avísalo tú mismo por teléfono o avisa al administrador para que lo gestione.
      </Info>
    </div>
  )
}

function CrearReserva() {
  return (
    <div>
      <H2>5. Crear nueva reserva</H2>
      <P>
        Puedes crear una reserva a nombre de cualquier vecino sin restricciones de antelación.
      </P>
      <Ol>
        <li>Pulsa <strong>+ Reserva</strong> en la cabecera del panel.</li>
        <li>Busca al vecino por nombre o introduce su vivienda.</li>
        <li>Elige el recurso y la fecha.</li>
        <li>Selecciona la franja horaria disponible.</li>
        <li>Confirma la reserva.</li>
      </Ol>
      <H3>Diferencias con la reserva de un vecino</H3>
      <Ul>
        <li>No hay límite de antelación mínima ni máxima (salvo 1 año).</li>
        <li>Puedes reservar franjas que ya han comenzado (margen de 60 segundos).</li>
        <li>La reserva queda registrada como creada por ti, no por el vecino.</li>
      </Ul>
    </div>
  )
}

function InterpretarTarjetas() {
  return (
    <div>
      <H2>6. Interpretar las tarjetas</H2>
      <P>
        Cada tarjeta tiene un color de borde que indica el estado de la reserva.
      </P>
      <H3>Colores de estado</H3>
      <Ul>
        <li><strong>Verde</strong>: el vecino ya fue marcado como presentado.</li>
        <li><strong>Gris</strong>: reserva confirmada, aún sin marcar.</li>
        <li><strong>Rojo</strong>: reserva cancelada.</li>
      </Ul>
      <H3>Badge azul (Club Social)</H3>
      <P>
        Las reservas del Club Social muestran un badge azul «Club Social» y pueden incluir un coste según la tarifa configurada
        (2h, 6h, 12h). Si hay pago pendiente, el administrador lo gestiona desde su panel.
      </P>
      <Info>
        Tu trabajo es únicamente verificar que hay reserva y marcar la asistencia. Los pagos son responsabilidad del administrador.
      </Info>
    </div>
  )
}

function AvisosEspeciales() {
  return (
    <div>
      <H2>7. Avisos especiales</H2>
      <P>
        El administrador puede publicar avisos que aparecen en la app de los vecinos.
        Estos avisos no se muestran directamente en tu panel, pero los vecinos los ven al entrar.
      </P>
      <H3>Bloqueos de franjas</H3>
      <P>
        Si hay un mantenimiento o una franja bloqueada, esas horas no aparecen como disponibles para los vecinos.
        Los bloqueos los crea el administrador desde su panel.
      </P>
      <H3>Viviendas o usuarios bloqueados</H3>
      <P>
        Un vecino bloqueado no puede hacer nuevas reservas, pero sus reservas ya existentes siguen activas.
        Si un vecino bloqueado se presenta, déjalo entrar si tiene reserva confirmada.
      </P>
      <Aviso>
        Si tienes dudas sobre si dejar o no acceder a alguien, contacta con el administrador.
        No canceles reservas por tu cuenta salvo causa justificada.
      </Aviso>
    </div>
  )
}

function QueHacerSiQueja() {
  return (
    <div>
      <H2>8. Qué hacer si un vecino se queja</H2>
      <H3>«Mi reserva no aparece»</H3>
      <Ol>
        <li>Comprueba que estás viendo el día correcto.</li>
        <li>Busca por nombre o pide al vecino que te enseñe la confirmación en su móvil.</li>
        <li>Si no aparece, pídele que contacte con el administrador.</li>
      </Ol>
      <H3>«La franja estaba libre y no me dejó reservar»</H3>
      <P>
        Puede deberse a un bloqueo de franja o a un conflicto de horario. El administrador puede revisar los bloqueos activos
        y crear la reserva manualmente si procede.
      </P>
      <H3>«Mi cuenta está bloqueada»</H3>
      <P>
        Solo el administrador puede desbloquear cuentas. Deriva al vecino con el administrador o con la administración de la
        comunidad.
      </P>
      <H3>Cualquier incidencia técnica</H3>
      <P>
        Si la app no carga, hay un error visible o algo no funciona como esperabas, anota qué pasó y cuándo, y comunícaselo
        al administrador o al desarrollador.
      </P>
      <Info>
        Tu rol es operativo, no administrativo. Ante la duda, escala al administrador en lugar de tomar decisiones que
        puedan afectar a otros vecinos.
      </Info>
    </div>
  )
}

// ─── Estructura ───────────────────────────────────────────────────────────────

const SECCIONES = [
  { titulo: '1. Bienvenida', componente: <Bienvenida /> },
  { titulo: '2. Ver reservas del día', componente: <VerReservasDia /> },
  { titulo: '3. Marcar asistencia', componente: <MarcarAsistencia /> },
  { titulo: '4. Cancelar reserva', componente: <CancelarReserva /> },
  { titulo: '5. Crear nueva reserva', componente: <CrearReserva /> },
  { titulo: '6. Interpretar las tarjetas', componente: <InterpretarTarjetas /> },
  { titulo: '7. Avisos especiales', componente: <AvisosEspeciales /> },
  { titulo: '8. Qué hacer si un vecino se queja', componente: <QueHacerSiQueja /> },
]

export default function GuardaManual() {
  const [seccionActiva, setSeccionActiva] = useState(0)

  return (
    <main className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-slate-50 font-bold text-lg">Manual del guarda</p>
            <p className="text-slate-400 text-sm">Guía de uso del panel</p>
          </div>
          <a
            href="/guarda/hoy"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Volver
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Selector móvil — fuera del flex para ocupar ancho completo */}
        <div className="md:hidden mb-4">
          <select
            value={seccionActiva}
            onChange={(e) => setSeccionActiva(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
          >
            {SECCIONES.map((s, i) => (
              <option key={i} value={i}>{s.titulo}</option>
            ))}
          </select>
        </div>

        {/* Layout: sidebar desktop + contenido */}
        <div className="flex gap-6">
          {/* Sidebar desktop */}
          <nav className="hidden md:block w-56 shrink-0">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {SECCIONES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSeccionActiva(i)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-slate-700 last:border-b-0 ${
                    seccionActiva === i
                      ? 'bg-teal-700 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s.titulo}
                </button>
              ))}
            </div>
          </nav>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-6 break-words">
              {SECCIONES[seccionActiva].componente}
            </div>

            {/* Navegación entre secciones */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setSeccionActiva((i) => Math.max(0, i - 1))}
                disabled={seccionActiva === 0}
                className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-500">{seccionActiva + 1} / {SECCIONES.length}</span>
              <button
                onClick={() => setSeccionActiva((i) => Math.min(SECCIONES.length - 1, i + 1))}
                disabled={seccionActiva === SECCIONES.length - 1}
                className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
