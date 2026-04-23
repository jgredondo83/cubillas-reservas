import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useTemaAdmin } from '../../hooks/useTemaAdmin'

// ─── Helpers de estilo ────────────────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-indigo-700 mb-4">{children}</h2>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-700 mb-3 leading-relaxed">{children}</p>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-3 ml-1">{children}</ul>
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 mb-3 ml-1">{children}</ol>
}

function Ruta({ children }: { children: string }) {
  return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-sm mb-3 leading-relaxed">
      ⚠️ {children}
    </div>
  )
}

function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-900 text-sm mb-3 leading-relaxed">
      💡 {children}
    </div>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">{children}</h3>
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function Introduccion() {
  return (
    <div>
      <H2>1. Introducción</H2>
      <P>
        Bienvenido/a al panel de administración de <strong>Parque del Cubillas Reservas</strong>.
        Este manual te explica cómo gestionar el día a día de las instalaciones deportivas y del club social de la comunidad.
      </P>
      <P>
        Como administrador/a, puedes gestionar usuarios, reservas, pagos, bloqueos, avisos y todos los textos del sistema.
        Los vecinos ven la app desde su móvil y reservan de forma autónoma; tú supervisas y resuelves incidencias.
      </P>
      <H3>Qué puedes hacer</H3>
      <Ul>
        <li>Crear, editar y bloquear cuentas de vecinos.</li>
        <li>Ver y gestionar todas las reservas de la comunidad.</li>
        <li>Registrar pagos del Club Social.</li>
        <li>Revisar no presentados y decidir qué acción tomar.</li>
        <li>Publicar avisos globales para todos los vecinos.</li>
        <li>Bloquear franjas horarias de cualquier recurso.</li>
        <li>Editar textos del sistema (bienvenida, normas, contacto).</li>
        <li>Consultar estadísticas del mes.</li>
      </Ul>
      <Info>
        Si algo no funciona o tienes dudas técnicas sobre la app, contacta con el desarrollador.
      </Info>
    </div>
  )
}

function GestionarUsuarios() {
  return (
    <div>
      <H2>2. Gestionar usuarios</H2>
      <P>
        Accede desde <Ruta>/admin/usuarios</Ruta>. Verás la lista completa de vecinos con su vivienda, estado y rol.
      </P>

      <H3>Crear vecino nuevo</H3>
      <P>
        Úsalo cuando un vecino nuevo llega a la comunidad y necesita acceso a la app.
      </P>
      <Ol>
        <li>Pulsa <strong>Nuevo usuario</strong>.</li>
        <li>Introduce nombre, apellidos, email, teléfono y vivienda.</li>
        <li>Al guardar, el sistema envía un <strong>magic link</strong> al email del vecino.</li>
        <li>El vecino pulsa el enlace desde su móvil y accede sin contraseña.</li>
      </Ol>
      <Info>
        El magic link caduca en 24h. Si el vecino no lo recibe, comprueba la carpeta de spam. Puedes reenviar el link desde el detalle del usuario.
      </Info>

      <H3>Ver y editar un usuario</H3>
      <P>
        Pulsa en cualquier fila para abrir el detalle. Puedes editar nombre, apellidos, teléfono, alias y vivienda asignada.
        Verás también sus reservas activas y su historial.
      </P>

      <H3>Bloquear y desbloquear cuenta</H3>
      <P>Desde el detalle del usuario, sección <strong>Bloqueo</strong>:</P>
      <Ul>
        <li><strong>Bloqueo temporal</strong>: introduce una fecha fin. El vecino no puede reservar hasta esa fecha.</li>
        <li><strong>Bloqueo indefinido</strong>: deja la fecha vacía. Mantén activo hasta que decidas desbloquearlo.</li>
        <li><strong>Desbloquear</strong>: pulsa el botón correspondiente. El usuario recupera su estado anterior.</li>
      </Ul>
      <Aviso>
        Un vecino bloqueado puede ver la app pero no crear nuevas reservas. Sus reservas existentes NO se cancelan automáticamente.
      </Aviso>

      <H3>Eliminar cuenta (RGPD)</H3>
      <P>
        Solo disponible en <Ruta>/perfil</Ruta> del propio vecino. Cuando un vecino solicita la eliminación:
      </P>
      <Ul>
        <li>Sus reservas futuras se cancelan automáticamente.</li>
        <li>Sus reservas pasadas se conservan anonimizadas (sin nombre ni datos personales).</li>
        <li>El usuario desaparece del sistema de autenticación.</li>
      </Ul>
      <Aviso>
        Esta acción es irreversible. Asegúrate de que el vecino entiende las consecuencias antes de proceder.
      </Aviso>

      <H3>Cambiar email (solo super_admin)</H3>
      <P>
        Desde el detalle del usuario, editar el campo email. Solo disponible para el rol <strong>super_admin</strong>.
        Requiere que el vecino vuelva a iniciar sesión con el nuevo email.
      </P>
    </div>
  )
}

function GestionarViviendas() {
  return (
    <div>
      <H2>3. Gestionar viviendas</H2>
      <P>
        Accede desde <Ruta>/admin/viviendas</Ruta>. Lista de todas las viviendas de la comunidad con su referencia, bloque y vecinos asociados.
      </P>

      <H3>Ver vecinos de una vivienda</H3>
      <P>
        Pulsa en una vivienda para ver su detalle. Verás los vecinos registrados con esa vivienda asignada y sus datos.
      </P>

      <H3>Bloquear vivienda por impago</H3>
      <Ol>
        <li>Entra al detalle de la vivienda.</li>
        <li>Pulsa <strong>Bloquear por impago</strong> e introduce el motivo.</li>
        <li>Todos los vecinos de esa vivienda quedan bloqueados para reservar.</li>
      </Ol>
      <Aviso>
        Al bloquear una vivienda, ningún vecino de esa vivienda puede crear nuevas reservas hasta que se desbloquee. Las reservas existentes no se cancelan.
      </Aviso>

      <H3>Desbloquear vivienda</H3>
      <P>
        Desde el detalle de la vivienda, pulsa <strong>Desbloquear</strong>. El acceso se restaura de inmediato para todos sus vecinos.
      </P>

      <H3>Crear vivienda nueva</H3>
      <P>
        Desde <Ruta>/admin/viviendas</Ruta>, pulsa <strong>Nueva vivienda</strong>. Introduce la referencia y datos opcionales (bloque, número, letra, planta).
      </P>
    </div>
  )
}

function GestionarReservas() {
  return (
    <div>
      <H2>4. Gestionar reservas</H2>
      <P>
        Accede desde <Ruta>/admin/reservas</Ruta>. Vista completa de todas las reservas con filtros por fecha, estado, recurso y vecino.
      </P>

      <H3>Filtros disponibles</H3>
      <Ul>
        <li><strong>Fecha</strong>: muestra las reservas de un día concreto.</li>
        <li><strong>Estado</strong>: confirmada, pagado, pendiente de pago, cancelada, completada, no presentado.</li>
        <li><strong>Recurso</strong>: filtra por pista de pádel, tenis o Club Social.</li>
        <li><strong>Vivienda / Usuario</strong>: busca reservas de un vecino concreto.</li>
      </Ul>

      <H3>Crear reserva para un vecino</H3>
      <Ol>
        <li>Pulsa <strong>Nueva reserva</strong> en <Ruta>/admin/reservas/nueva</Ruta>.</li>
        <li>Busca al vecino por nombre o vivienda.</li>
        <li>Selecciona recurso, fecha y franja horaria.</li>
        <li>Si la vivienda ya tiene el límite de reservas activas, aparecerá un aviso. Puedes activar <strong>Forzar reserva</strong> si el caso lo justifica.</li>
      </Ol>
      <Info>
        Como admin puedes reservar hasta con 365 días de antelación, sin restricciones de antelación mínima ni máxima del recurso.
      </Info>

      <H3>Cancelar reserva</H3>
      <P>
        Desde el detalle de una reserva, pulsa <strong>Cancelar</strong> e introduce el motivo. La cancelación queda registrada con tu nombre y la hora.
      </P>
    </div>
  )
}

function PagosClubSocial() {
  return (
    <div>
      <H2>5. Registrar pagos del Club Social</H2>
      <P>
        El Club Social requiere pago previo. El flujo completo es:
      </P>
      <Ol>
        <li>Vecino reserva desde la app → estado <strong>pendiente de pago</strong>.</li>
        <li>El vecino pasa por administración y abona el importe y fianza.</li>
        <li>Tú registras el pago desde el detalle de la reserva → estado cambia a <strong>pagado</strong>.</li>
        <li>El guarda ve la tarjeta en color fuchsia/morado y puede entregar las llaves.</li>
      </Ol>

      <H3>Cómo registrar un pago</H3>
      <Ol>
        <li>Abre la reserva desde <Ruta>/admin/reservas</Ruta> (filtra por estado "pendiente de pago").</li>
        <li>Pulsa <strong>Registrar pago</strong> en el detalle de la reserva.</li>
        <li>El modal muestra el importe preconfigurado (ej. 40 €) y la fianza (ej. 210 €).</li>
        <li>Selecciona el método: bizum, transferencia, efectivo u otros.</li>
        <li>Añade referencia si la hay.</li>
        <li>Guarda. El estado pasa a <strong>pagado</strong> y el guarda lo verá al momento.</li>
      </Ol>

      <Aviso>
        Nunca entregues las llaves del Club Social si la tarjeta aparece en rojo con "Pte. pago". El guarda debe ver el badge morado/fuchsia ("Pagado") para proceder.
      </Aviso>

      <H3>Plazos</H3>
      <P>
        Cada recurso del Club Social tiene configurado un plazo límite de pago (normalmente 3–5 días desde la reserva).
        Si el vecino no paga en ese plazo, la reserva puede cancelarse manualmente.
      </P>
    </div>
  )
}

function NoPresentados() {
  return (
    <div>
      <H2>6. Revisar no presentados</H2>
      <P>
        Accede desde <Ruta>/admin/no-presentados</Ruta>. Aquí aparecen las reservas pasadas que el guarda no marcó (ni presentado ni no presentado).
        El sistema las detecta automáticamente la noche siguiente y las pone en estado <strong>pendiente de revisar</strong>.
      </P>

      <H3>4 acciones posibles</H3>
      <Ul>
        <li><strong>Confirmar no presentado</strong>: el vecino no fue. Suma al contador de ausencias.</li>
        <li><strong>Marcar como presentado</strong>: el guarda se olvidó de marcarlo. No penaliza.</li>
        <li><strong>Cancelar reserva</strong>: si la situación lo requiere.</li>
        <li><strong>Deshacer</strong>: si cometiste un error al marcar.</li>
      </Ul>

      <Aviso>
        Si un vecino acumula <strong>2 no presentados en 30 días</strong>, el sistema lo bloquea automáticamente durante 7 días. El contador aparece en cada tarjeta. Si el segundo sería un bloqueo, verás una advertencia en naranja antes de confirmar.
      </Aviso>

      <Info>
        Revisa esta sección a diario, preferiblemente por la mañana. Las tarjetas del dashboard muestran cuántas reservas están pendientes de revisión.
      </Info>
    </div>
  )
}

function Avisos() {
  return (
    <div>
      <H2>7. Crear avisos globales</H2>
      <P>
        Accede desde <Ruta>/admin/avisos</Ruta>. Los avisos aparecen como un banner en la app de todos los vecinos, en la pantalla de inicio y en "Mis reservas".
      </P>

      <H3>Tipos de aviso</H3>
      <Ul>
        <li><strong>Info (azul)</strong>: información general, cambios de horario, novedades.</li>
        <li><strong>Advertencia (ámbar)</strong>: cosas a tener en cuenta antes de reservar.</li>
        <li><strong>Urgente (rojo)</strong>: cierre inesperado, avería, urgencia real.</li>
      </Ul>

      <H3>Crear un aviso</H3>
      <Ol>
        <li>Pulsa <strong>Nuevo aviso</strong>.</li>
        <li>Elige el tipo, escribe título y contenido.</li>
        <li>Opcionalmente, indica fechas de inicio y fin (si dejas fecha fin vacía, el aviso no caduca).</li>
        <li>Al guardar, el aviso anterior se desactiva automáticamente. Solo puede haber uno activo a la vez.</li>
      </Ol>

      <H3>Ejemplos de uso</H3>
      <Ul>
        <li>"Las pistas estarán cerradas el sábado por mantenimiento."</li>
        <li>"Nuevos horarios del Club Social desde el 1 de mayo."</li>
        <li>"La pista de pádel 2 está fuera de servicio por obras."</li>
      </Ul>

      <Info>
        Los vecinos pueden cerrar el banner para el día actual. Al día siguiente vuelve a aparecer si el aviso sigue activo.
      </Info>
    </div>
  )
}

function BloqueosFranjas() {
  return (
    <div>
      <H2>8. Bloquear franjas horarias</H2>
      <P>
        Accede desde <Ruta>/admin/bloqueos-franjas</Ruta>. Permite cerrar un recurso completo durante un horario y periodo concretos, independientemente de las reservas.
      </P>

      <H3>Cuándo usarlo</H3>
      <Ul>
        <li>Torneo interno: "Pista de pádel cerrada del 5 al 7 mayo, 9:00–18:00."</li>
        <li>Cierre por obras: "Pista de tenis Nevada cerrada indefinidamente desde el 1 de junio."</li>
        <li>Mantenimiento puntual: "Club Social no disponible el sábado 10."</li>
      </Ul>

      <H3>Crear un bloqueo</H3>
      <Ol>
        <li>Selecciona el recurso.</li>
        <li>Introduce fecha inicio, fecha fin (opcional, vacío = indefinido), hora inicio y hora fin.</li>
        <li>Escribe el motivo (los vecinos lo verán si intentan reservar).</li>
        <li>Pulsa <strong>Crear bloqueo</strong>.</li>
        <li>Si hay reservas ya creadas en esa franja, el sistema te mostrará la lista. Cancélalas manualmente y vuelve a intentarlo.</li>
      </Ol>

      <H3>Desactivar un bloqueo</H3>
      <P>
        Desde la lista de bloqueos activos, pulsa <strong>Desactivar</strong>. El recurso vuelve a estar disponible de inmediato.
      </P>

      <Aviso>
        Un bloqueo activo impide cualquier nueva reserva en esa franja. Las reservas ya existentes no se cancelan automáticamente: debes hacerlo a mano antes de crear el bloqueo.
      </Aviso>
    </div>
  )
}

function TextosSistema() {
  return (
    <div>
      <H2>9. Editar textos del sistema</H2>
      <P>
        Accede desde <Ruta>/admin/textos</Ruta>. Puedes cambiar los textos que aparecen en la app sin necesidad de modificar código.
      </P>

      <H3>Textos disponibles</H3>
      <Ul>
        <li><strong>Contacto vigilante</strong>: datos que aparecen en los emails de confirmación de reserva (nombre, teléfono, horario del guarda).</li>
        <li><strong>Contacto administración</strong>: datos que aparecen en mensajes de bloqueo, impago y otros avisos administrativos.</li>
        <li><strong>Mensaje de bienvenida</strong>: texto libre que aparece en la pantalla de inicio del vecino. Soporta negrita y cursiva básica.</li>
        <li><strong>Normas de uso</strong>: texto accesible desde <Ruta>/normas-uso</Ruta>. Actualizable cuando cambie el reglamento.</li>
      </Ul>

      <H3>Cómo editar</H3>
      <Ol>
        <li>Edita el texto en el campo correspondiente.</li>
        <li>Pulsa <strong>Guardar</strong> (el botón se activa solo cuando hay cambios).</li>
        <li>El cambio entra en vigor de inmediato para todos los vecinos.</li>
      </Ol>

      <Info>
        Los cambios en "Mensaje de bienvenida" y "Normas de uso" son visibles al instante. Los cambios en datos de contacto afectan a los emails que se envíen a partir de ese momento.
      </Info>
    </div>
  )
}

function Estadisticas() {
  return (
    <div>
      <H2>10. Estadísticas del dashboard</H2>
      <P>
        El <Ruta>/admin</Ruta> (dashboard) muestra un resumen visual del estado de la comunidad.
      </P>

      <H3>Tarjetas superiores</H3>
      <Ul>
        <li><strong>Usuarios pendientes</strong>: vecinos que se han registrado pero aún no han sido verificados. Revísalos en <Ruta>/admin/usuarios</Ruta>.</li>
        <li><strong>Reservas hoy</strong>: total de reservas activas para el día de hoy (confirmadas + pendientes de pago + pagadas).</li>
        <li><strong>No presentados (pte. revisar)</strong>: reservas del día anterior sin asistencia marcada. Accede a <Ruta>/admin/no-presentados</Ruta>.</li>
        <li><strong>Pagos pendientes</strong>: reservas de Club Social en estado "pendiente de pago". Accede a ellas filtrando por ese estado en <Ruta>/admin/reservas</Ruta>.</li>
        <li><strong>Viviendas con impago</strong>: viviendas actualmente bloqueadas por impago.</li>
      </Ul>

      <H3>Indicador de aviso activo</H3>
      <P>
        Justo debajo de las tarjetas, aparece el aviso activo actual (si lo hay). Pulsa para ir a <Ruta>/admin/avisos</Ruta> y gestionarlo.
      </P>

      <H3>Estadísticas del mes en curso</H3>
      <Ul>
        <li><strong>Total reservas</strong>: número de reservas creadas en el mes actual.</li>
        <li><strong>% Asistencia</strong>: porcentaje de reservas completadas sobre el total de finalizadas. Un porcentaje bajo indica muchos no presentados.</li>
        <li><strong>Recurso top</strong>: el recurso con más reservas del mes.</li>
        <li><strong>Vecino top</strong>: el vecino con más reservas del mes (solo visible si hay más de 2 vecinos con reservas).</li>
      </Ul>

      <H3>Tabla de ocupación</H3>
      <P>
        Muestra el porcentaje de ocupación de cada recurso en lo que va de mes:
      </P>
      <Ul>
        <li><strong>Verde</strong>: ocupación baja (&lt;40%). El recurso tiene mucha disponibilidad.</li>
        <li><strong>Ámbar</strong>: ocupación media (40–70%).</li>
        <li><strong>Rojo</strong>: ocupación alta (&gt;70%). Posible cuello de botella.</li>
      </Ul>
    </div>
  )
}

// ─── Datos de secciones ───────────────────────────────────────────────────────

const SECCIONES = [
  { titulo: '1. Introducción', componente: <Introduccion /> },
  { titulo: '2. Usuarios', componente: <GestionarUsuarios /> },
  { titulo: '3. Viviendas', componente: <GestionarViviendas /> },
  { titulo: '4. Reservas', componente: <GestionarReservas /> },
  { titulo: '5. Pagos Club Social', componente: <PagosClubSocial /> },
  { titulo: '6. No presentados', componente: <NoPresentados /> },
  { titulo: '7. Avisos globales', componente: <Avisos /> },
  { titulo: '8. Bloqueos de franjas', componente: <BloqueosFranjas /> },
  { titulo: '9. Textos del sistema', componente: <TextosSistema /> },
  { titulo: '10. Estadísticas', componente: <Estadisticas /> },
]

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AdminManual() {
  const tema = useTemaAdmin()
  const [activa, setActiva] = useState(0)

  return (
    <AdminLayout titulo="Manual de uso">
      {/* Mobile: selector de sección */}
      <div className="md:hidden mb-4">
        <select
          value={activa}
          onChange={(e) => setActiva(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {SECCIONES.map((s, i) => (
            <option key={i} value={i}>{s.titulo}</option>
          ))}
        </select>
      </div>

      {/* Layout desktop: sidebar + contenido */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="hidden md:block w-48 shrink-0">
          <div className="sticky top-0 space-y-0.5">
            {SECCIONES.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiva(i)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  activa === i
                    ? `${tema.btnPrimario} text-white font-medium`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s.titulo}
              </button>
            ))}
          </div>
        </nav>

        {/* Contenido */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-4 md:p-6 break-words">
          {SECCIONES[activa].componente}
        </div>
      </div>
    </AdminLayout>
  )
}
