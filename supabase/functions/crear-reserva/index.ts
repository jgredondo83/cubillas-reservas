import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { enviarEmailBrevo, plantillaReservaConfirmada } from '../_shared/emails.ts'

interface CrearReservaBody {
  recurso_id: string
  fecha: string // YYYY-MM-DD
  hora_inicio: string // HH:mm
  duracion_minutos: number
  usuario_id?: string // Solo para guarda/admin: crear reserva en nombre de otro
  forzar?: boolean // Solo admin/super_admin: salta límite de reservas activas por vivienda
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

    // Parsear body
    const body: CrearReservaBody = await req.json()
    const { recurso_id, fecha, hora_inicio, duracion_minutos, usuario_id: targetUserId, forzar } = body

    if (!recurso_id || !fecha || !hora_inicio || !duracion_minutos) {
      return respuesta(400, 'Faltan campos obligatorios: recurso_id, fecha, hora_inicio, duracion_minutos')
    }

    // Si se pide crear en nombre de otro usuario, verificar privilegios
    let perfilObjetivo = perfil
    if (targetUserId && targetUserId !== user.id) {
      if (!['guarda', 'admin', 'super_admin'].includes(perfil.rol)) {
        return respuesta(403, 'No tienes permiso para crear reservas en nombre de otro usuario')
      }
      const { data: po } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle()
      if (!po) {
        return respuesta(404, 'Usuario objetivo no encontrado')
      }
      perfilObjetivo = po
    }

    // 3. Cargar vivienda (del usuario objetivo)
    const { data: vivienda } = await supabase
      .from('viviendas')
      .select('*')
      .eq('id', perfilObjetivo.vivienda_id)
      .single()

    // Cargar contacto_administracion para mensajes de error (bloqueos, impagos)
    const { data: textoAdmin } = await supabase
      .from('textos_admin')
      .select('contenido')
      .eq('clave', 'contacto_administracion')
      .eq('comunidad_id', perfilObjetivo.comunidad_id)
      .maybeSingle()
    const datosContactoAdmin = textoAdmin?.contenido ?? ''

    const esEnNombreDe = perfilObjetivo.id !== user.id

    if (vivienda?.bloqueada_por_impago) {
      const mensajePrincipal = esEnNombreDe
        ? `La vivienda de ${perfilObjetivo.nombre} ${perfilObjetivo.apellidos} tiene pagos pendientes con la administración.`
        : 'Esta vivienda tiene pagos pendientes con la administración.'
      const instrucciones = esEnNombreDe
        ? 'Un administrador puede gestionar el bloqueo desde el panel de admin.'
        : `Contacta con administración para regularizar la situación. ${datosContactoAdmin}`
      return respuesta(403, mensajePrincipal + '\n\n' + instrucciones)
    }

    // 4. Usuario bloqueado (se comprueba el objetivo, no el caller)
    // Dos casos: bloqueo con fecha (automático por no-presentados) o sin fecha (manual por admin, indefinido)
    const estaBloqueado = perfilObjetivo.estado === 'bloqueado' &&
      (perfilObjetivo.bloqueado_hasta === null || new Date(perfilObjetivo.bloqueado_hasta) > new Date())

    if (estaBloqueado) {
      let mensajePrincipal: string
      let instrucciones: string

      if (perfilObjetivo.bloqueado_hasta) {
        // Bloqueo temporal (automático o con fecha)
        const fechaStr = new Date(perfilObjetivo.bloqueado_hasta).toLocaleDateString('es-ES', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid',
        })
        mensajePrincipal = esEnNombreDe
          ? `La cuenta de ${perfilObjetivo.nombre} ${perfilObjetivo.apellidos} está bloqueada temporalmente hasta el ${fechaStr}.`
          : `Tu cuenta está bloqueada temporalmente hasta el ${fechaStr}.`
      } else {
        // Bloqueo indefinido (manual por admin)
        mensajePrincipal = esEnNombreDe
          ? `La cuenta de ${perfilObjetivo.nombre} ${perfilObjetivo.apellidos} está bloqueada de forma indefinida.`
          : 'Tu cuenta está bloqueada de forma indefinida.'
      }

      instrucciones = esEnNombreDe
        ? 'Un administrador puede desbloquear la cuenta desde el panel de admin si procede.'
        : `Contacta con administración para más información. ${datosContactoAdmin}`

      return respuesta(403, mensajePrincipal + '\n\n' + instrucciones)
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

    // 9. Antelación y franja pasada
    // - Solo admin/super_admin pueden saltarse las restricciones del recurso.
    //   Con forzar=true saltan además el límite de reservas activas (step 14).
    // - Guarda reservando para un vecino: MISMAS restricciones que el vecino.
    //   El guarda simplemente opera en nombre del vecino desde la garita.
    // - Vecino para sí mismo: todas las restricciones del recurso.
    const ahora = new Date()
    const hoyMedianoche = new Date(ahora)
    hoyMedianoche.setHours(0, 0, 0, 0)
    const fechaObj = new Date(`${fecha}T00:00:00`)
    const diffDias = Math.floor((fechaObj.getTime() - hoyMedianoche.getTime()) / 86400000)

    const callerPuedeSaltarReglas = perfil.rol === 'admin' || perfil.rol === 'super_admin'

    if (!callerPuedeSaltarReglas) {
      // Vecino o guarda: aplican restricciones del recurso para el perfil objetivo
      const antelacionMax = (config.antelacion_dias as number) ?? 7
      const antelacionMin = (config.antelacion_minima_dias as number) ?? 0

      if (diffDias < antelacionMin) {
        return respuesta(400, `Esta reserva requiere una antelación mínima de ${antelacionMin} día(s).`)
      }
      if (diffDias > antelacionMax) {
        return respuesta(400, `Esta reserva no puede hacerse con más de ${antelacionMax} días de antelación.`)
      }
      if (inicio < ahora) {
        return respuesta(400, 'No se puede reservar una franja que ya ha pasado.')
      }
    } else {
      // Admin/super_admin: hard cap 365 días, tolerancia 60s para race conditions
      if (diffDias > 365) {
        return respuesta(400, 'No se permiten reservas con más de 1 año de antelación.')
      }
      if (inicio < new Date(Date.now() - 60000)) {
        return respuesta(400, 'No se puede reservar una franja que ya ha pasado.')
      }
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

    // 11. Bloqueos de franja (nuevo schema: fecha_inicio/fin + hora_inicio/fin)
    const { data: bloqueosFranja } = await supabase
      .from('bloqueos')
      .select('motivo')
      .eq('comunidad_id', perfilObjetivo.comunidad_id)
      .eq('recurso_id', recurso_id)
      .eq('activo', true)
      .lte('fecha_inicio', fecha)
      .or(`fecha_fin.is.null,fecha_fin.gte.${fecha}`)
      .lt('hora_inicio', finHHmm)
      .gt('hora_fin', hora_inicio)

    if (bloqueosFranja && bloqueosFranja.length > 0) {
      const motivo = bloqueosFranja[0].motivo ?? 'Franja bloqueada por administración'
      return respuesta(409, `Este recurso no está disponible en la franja solicitada. Motivo: ${motivo}. Contacta con administración si necesitas información.`)
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
    // FORZAR: admin/super_admin con body.forzar=true puede saltar SOLO este check.
    // NO se salta: horario, solapamiento, bloqueos usuario/vivienda/franja, antelación.
    const maxActivas = (config.max_reservas_activas_por_vivienda as number) ?? 1
    const hoyISO = new Date().toISOString()

    const { count: activasCount } = await supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('recurso_id', recurso_id)
      .eq('vivienda_id', perfilObjetivo.vivienda_id)
      .in('estado', ['confirmada', 'pendiente_pago', 'pagado'])
      .gte('fin', hoyISO)

    if ((activasCount ?? 0) >= maxActivas) {
      const esAdmin = ['admin', 'super_admin'].includes(perfil.rol)

      if (esAdmin && forzar) {
        // Admin forzó: saltar SOLO el límite de reservas activas por vivienda
      } else {
        const mensaje = esEnNombreDe
          ? `La vivienda de ${perfilObjetivo.nombre} ${perfilObjetivo.apellidos} ya tiene ${maxActivas} reserva(s) activa(s) de este recurso.`
          : `Tu vivienda ya tiene ${maxActivas} reserva(s) activa(s) de este recurso. Cancela alguna antes de hacer otra.`

        return new Response(JSON.stringify({
          error: mensaje,
          codigo: 'LIMITE_RESERVAS_ACTIVAS',
          puedeForzar: esAdmin,
          reservas_activas: activasCount ?? 0,
          max_reservas: maxActivas,
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 15. Estado inicial
    const estadoInicial = config.requiere_pago ? 'pendiente_pago' : 'confirmada'

    // 16. INSERT
    const { data: reserva, error: insertError } = await supabase
      .from('reservas')
      .insert({
        comunidad_id: perfilObjetivo.comunidad_id,
        recurso_id,
        usuario_id: perfilObjetivo.id,
        vivienda_id: perfilObjetivo.vivienda_id,
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

    // 17. Email de confirmación (best effort — no falla la reserva si falla el email)
    try {
      const [authUserData, textoGeneral] = await Promise.all([
        supabase.auth.admin.getUserById(perfilObjetivo.id),
        supabase.from('textos_admin').select('contenido')
          .eq('clave', 'contacto_general')
          .eq('comunidad_id', reserva.comunidad_id)
          .maybeSingle(),
      ])
      const emailDestino = authUserData.data.user?.email
      const datosContactoGeneral = textoGeneral.data?.contenido ?? ''
      if (emailDestino) {
        const cruzaMedianoche = finTotalMin >= 24 * 60
        const fechaLarga = new Date(fecha + 'T12:00:00Z').toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          timeZone: 'Europe/Madrid',
        })
        const appUrl = Deno.env.get('APP_URL') ?? 'https://cubillas-reservas.vercel.app'
        const html = plantillaReservaConfirmada({
          nombreVecino: `${perfilObjetivo.nombre} ${perfilObjetivo.apellidos}`,
          nombreRecurso: recurso.nombre,
          fechaLarga,
          horaInicio: hora_inicio,
          horaFin: finHHmm,
          cruzaMedianoche,
          estado: estadoInicial,
          urlMisReservas: `${appUrl}/mis-reservas`,
          costeEuros: config.coste_euros as number | undefined,
          fianzaEuros: config.fianza_euros as number | undefined,
          datosContacto: datosContactoGeneral,
        })
        const subject = estadoInicial === 'pendiente_pago'
          ? `Reserva pendiente de pago — ${recurso.nombre}`
          : `Reserva confirmada — ${recurso.nombre}`
        const emailResult = await enviarEmailBrevo({
          to: { email: emailDestino, name: `${perfilObjetivo.nombre} ${perfilObjetivo.apellidos}` },
          subject,
          htmlContent: html,
        })
        console.log('Email confirmación reserva:', emailResult)
      }
    } catch (emailErr) {
      console.error('Error enviando email confirmación:', emailErr)
    }

    // 18. Texto post-reserva
    let textoPostReserva: string | null = null
    const clave = config.texto_post_reserva_clave as string | undefined
    if (clave) {
      const { data: texto } = await supabase
        .from('textos_admin')
        .select('contenido')
        .eq('clave', clave)
        .eq('comunidad_id', perfilObjetivo.comunidad_id)
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
