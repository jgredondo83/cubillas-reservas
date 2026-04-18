import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CrearReservaBody {
  recurso_id: string
  fecha: string // YYYY-MM-DD
  hora_inicio: string // HH:mm
  duracion_minutos: number
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return respuesta(401, 'No se ha proporcionado token de autenticación')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente con token del usuario (para auth)
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Cliente con service role (para saltarse RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return respuesta(401, 'Token no válido')
    }

    // 2. Cargar perfil
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!perfil) {
      return respuesta(403, 'Completa tu registro primero')
    }

    // 3. Cargar vivienda
    const { data: vivienda } = await supabase
      .from('viviendas')
      .select('*')
      .eq('id', perfil.vivienda_id)
      .single()

    if (vivienda?.bloqueada_por_impago) {
      return respuesta(403, vivienda.motivo_bloqueo || 'Tu vivienda tiene un bloqueo por impago. Contacta con administración.')
    }

    // 4. Usuario bloqueado
    if (perfil.bloqueado_hasta && new Date(perfil.bloqueado_hasta) > new Date()) {
      const hasta = new Date(perfil.bloqueado_hasta).toLocaleDateString('es-ES')
      return respuesta(403, `Tu cuenta está bloqueada hasta el ${hasta}`)
    }

    // Parsear body
    const body: CrearReservaBody = await req.json()
    const { recurso_id, fecha, hora_inicio, duracion_minutos } = body

    if (!recurso_id || !fecha || !hora_inicio || !duracion_minutos) {
      return respuesta(400, 'Faltan campos obligatorios: recurso_id, fecha, hora_inicio, duracion_minutos')
    }

    // 5. Cargar recurso
    const { data: recurso } = await supabase
      .from('recursos')
      .select('*')
      .eq('id', recurso_id)
      .maybeSingle()

    if (!recurso || !recurso.activo) {
      return respuesta(404, 'El recurso no existe o no está activo')
    }

    const config = recurso.config as Record<string, unknown>

    // 6. Solo admin
    if (config.solo_admin && !['admin', 'super_admin'].includes(perfil.rol)) {
      return respuesta(403, 'Este recurso solo está disponible para administradores')
    }

    // 7. Duración válida
    const duraciones = (config.duraciones_permitidas as number[]) || []
    if (!duraciones.includes(duracion_minutos)) {
      return respuesta(400, `Duración no permitida. Opciones: ${duraciones.join(', ')} minutos`)
    }

    // 8. Calcular inicio y fin (timestamptz Europe/Madrid)
    const [h, m] = hora_inicio.split(':').map(Number)
    const inicioISO = construirTimestampMadrid(fecha, hora_inicio)

    // Calcular hora de fin sumando duración
    const finTotalMin = h * 60 + m + duracion_minutos
    const finH = Math.floor(finTotalMin / 60) % 24
    const finM = finTotalMin % 60
    const finHHmm = `${String(finH).padStart(2, '0')}:${String(finM).padStart(2, '0')}`
    // Si cruza medianoche, el fin es el día siguiente
    const fechaFin = finTotalMin >= 24 * 60
      ? sumarDia(fecha)
      : fecha
    const finISO = construirTimestampMadrid(fechaFin, finHHmm)

    const inicio = new Date(inicioISO)
    const fin = new Date(finISO)

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return respuesta(400, 'Fecha u hora no válidas')
    }

    // 9. Antelación
    const ahora = new Date()
    const antelacionDias = (config.antelacion_dias as number) || 7
    const antelacionMinimaDias = (config.antelacion_minima_dias as number) || 0
    const fechaObj = new Date(`${fecha}T00:00:00`)

    const diffDias = Math.floor((fechaObj.getTime() - new Date(ahora.toDateString()).getTime()) / (86400000))

    if (diffDias < antelacionMinimaDias) {
      return respuesta(400, `No se puede reservar con menos de ${antelacionMinimaDias} día(s) de antelación`)
    }
    if (diffDias > antelacionDias) {
      return respuesta(400, `No se puede reservar con más de ${antelacionDias} días de antelación`)
    }

    // 10. Horario — ventanas es array de {desde, hasta}
    // REGLA: "00:00" como hasta = medianoche = 1440 minutos.
    // Sin horario_cruza_medianoche: franja [inicio, fin) debe caber en [desde, hasta).
    // Con horario_cruza_medianoche: solo se valida que hora_inicio esté en [desde, hasta].
    const ventanas = (config.horario as Record<string, Array<{desde: string; hasta: string}>>)?.default
    if (ventanas && ventanas.length > 0) {
      const franjaInicioMin = h * 60 + m
      const franjaFinMin = franjaInicioMin + duracion_minutos
      const cruzaMedianoche = !!config.horario_cruza_medianoche

      const dentroDeAlgunaVentana = ventanas.some((v) => {
        const vDesde = hhmmAMinutos(v.desde)
        const vHasta = v.hasta === '00:00' ? 1440 : hhmmAMinutos(v.hasta)

        if (cruzaMedianoche) {
          // Solo validar que hora_inicio está dentro de la ventana
          return franjaInicioMin >= vDesde && franjaInicioMin <= vHasta
        } else {
          // Franja completa debe caber dentro de la ventana
          return franjaInicioMin >= vDesde && franjaFinMin <= vHasta
        }
      })

      if (!dentroDeAlgunaVentana) {
        const resumen = ventanas.map((v) => `${v.desde}-${v.hasta}`).join(', ')
        return respuesta(400, `La franja no está dentro del horario permitido (${resumen})`)
      }
    }

    // 11. Bloqueos admin
    const { data: bloqueos } = await supabase
      .from('bloqueos')
      .select('*')
      .eq('recurso_id', recurso_id)
      .lt('inicio', finISO)
      .gt('fin', inicioISO)

    if (bloqueos && bloqueos.length > 0) {
      const motivo = bloqueos[0].motivo || 'Franja bloqueada por administración'
      return respuesta(409, `Franja bloqueada: ${motivo}`)
    }

    // 12 + 13. Solapamiento (mismo espacio, no solo mismo recurso)
    const { data: solapadas } = await supabase
      .from('reservas')
      .select('id, recurso_id, espacio_id')
      .eq('espacio_id', recurso.espacio_id)
      .in('estado', ['confirmada', 'pendiente_pago'])
      .lt('inicio', finISO)
      .gt('fin', inicioISO)

    if (solapadas && solapadas.length > 0) {
      return respuesta(409, 'Esa franja ya está reservada por otro vecino')
    }

    // 14. Máximo reservas activas por vivienda
    const maxActivas = (config.max_reservas_activas_por_vivienda as number) || 99
    const hoyISO = new Date().toISOString()

    const { count: activasCount } = await supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('recurso_id', recurso_id)
      .eq('vivienda_id', perfil.vivienda_id)
      .in('estado', ['confirmada', 'pendiente_pago'])
      .gte('fin', hoyISO)

    if ((activasCount ?? 0) >= maxActivas) {
      return respuesta(409, `Tu vivienda ya tiene ${maxActivas} reserva(s) activa(s) de este recurso. Cancela alguna antes de hacer otra.`)
    }

    // 15. Estado inicial
    const estadoInicial = config.requiere_pago ? 'pendiente_pago' : 'confirmada'

    // 16. INSERT
    const { data: reserva, error: insertError } = await supabase
      .from('reservas')
      .insert({
        comunidad_id: perfil.comunidad_id,
        recurso_id,
        usuario_id: user.id,
        vivienda_id: perfil.vivienda_id,
        creado_por: user.id,
        inicio: inicioISO,
        fin: finISO,
        estado: estadoInicial,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error insertando reserva:', insertError)
      if (insertError.code === '23P01') { // exclusion violation
        return respuesta(409, 'Esa franja ya está reservada por otro vecino')
      }
      return respuesta(500, 'Error al crear la reserva. Inténtalo de nuevo.')
    }

    // 17 + 18. Texto post-reserva
    let textoPostReserva: string | null = null
    const clave = config.texto_post_reserva_clave as string | undefined
    if (clave) {
      const { data: texto } = await supabase
        .from('textos_admin')
        .select('contenido')
        .eq('clave', clave)
        .eq('comunidad_id', perfil.comunidad_id)
        .maybeSingle()
      textoPostReserva = texto?.contenido ?? null
    }

    return respuesta(201, null, {
      reserva,
      texto_post_reserva: textoPostReserva,
    })
  } catch (err) {
    console.error('Error inesperado:', err)
    return respuesta(500, 'Error inesperado. Inténtalo de nuevo.')
  }
})

// --- Helpers ---

function hhmmAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Construye un ISO timestamp interpretando fecha+hora como Europe/Madrid */
function construirTimestampMadrid(fecha: string, horaHHmm: string): string {
  const [y, mo, d] = fecha.split('-').map(Number)
  const [hh, mm] = horaHHmm.split(':').map(Number)
  const offsetMin = getMadridOffsetMinutes(y, mo - 1, d, hh, mm)
  const utcMillis = Date.UTC(y, mo - 1, d, hh, mm) - offsetMin * 60_000
  return new Date(utcMillis).toISOString()
}

/** Obtiene el offset de Europe/Madrid en minutos para una fecha/hora dada */
function getMadridOffsetMinutes(year: number, month: number, day: number, hour: number, minute: number): number {
  const test = new Date(Date.UTC(year, month, day, hour, minute))
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    timeZoneName: 'shortOffset',
    hour: 'numeric',
  })
  const tz = fmt.formatToParts(test).find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
  const m = tz.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!m) return 0
  const sign = m[1] === '+' ? 1 : -1
  return sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0))
}

/** Suma 1 día a una fecha YYYY-MM-DD */
function sumarDia(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z') // mediodía para evitar problemas DST
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function respuesta(status: number, mensaje: string | null, data?: unknown) {
  const body = mensaje
    ? { error: mensaje }
    : { ...data as Record<string, unknown> }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
