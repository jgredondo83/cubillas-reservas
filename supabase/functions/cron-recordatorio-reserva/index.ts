import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { enviarEmailBrevo, plantillaRecordatorioReserva } from '../_shared/emails.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // FAIL-CLOSED: rechazar si la clave no coincide
  const cronKey = req.headers.get('x-cron-key')
  const expectedKey = Deno.env.get('CRON_SECRET_KEY')
  if (expectedKey && cronKey !== expectedKey) {
    return respuesta(401, 'Clave de cron no válida')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const appUrl = Deno.env.get('APP_URL') ?? 'https://cubillas.vercel.app'
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Ventana: reservas que empiezan entre ahora+50min y ahora+70min
  const ahora = new Date()
  const ventanaDesde = new Date(ahora.getTime() + 50 * 60 * 1000)
  const ventanaHasta = new Date(ahora.getTime() + 70 * 60 * 1000)

  const { data: reservas, error: errorQuery } = await supabase
    .from('reservas')
    .select('id, inicio, fin, usuario_id, comunidad_id, recursos(nombre, config)')
    .in('estado', ['confirmada', 'pagado', 'pendiente_pago'])
    .eq('recordatorio_enviado', false)
    .gte('inicio', ventanaDesde.toISOString())
    .lte('inicio', ventanaHasta.toISOString())
    .not('usuario_id', 'is', null)

  if (errorQuery) {
    console.error('Error buscando reservas:', errorQuery)
    return respuesta(500, 'Error al buscar reservas')
  }

  if (!reservas || reservas.length === 0) {
    return respuesta(200, null, { procesadas: 0, enviados: 0, errores: 0 })
  }

  let enviados = 0
  let errores = 0

  for (const reserva of reservas) {
    try {
      const recurso = reserva.recursos as { nombre: string; config: Record<string, unknown> } | null

      const [usuarioDB, authUserData, textoGeneral] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nombre, apellidos, alias')
          .eq('id', reserva.usuario_id)
          .maybeSingle(),
        supabase.auth.admin.getUserById(reserva.usuario_id as string),
        supabase
          .from('textos_admin')
          .select('contenido')
          .eq('clave', 'contacto_general')
          .eq('comunidad_id', reserva.comunidad_id)
          .maybeSingle(),
      ])

      const emailDestino = authUserData.data.user?.email
      const usuario = usuarioDB.data

      if (!emailDestino || !usuario) {
        console.warn(`Reserva ${reserva.id}: sin email o perfil de usuario, saltando`)
        continue
      }

      const cruzaMedianoche = recurso?.config?.horario_cruza_medianoche === true
      const inicio = new Date(reserva.inicio as string)
      const fin = new Date(reserva.fin as string)

      const opcionesMadrid = { timeZone: 'Europe/Madrid' } as const
      const fechaLarga = inicio.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...opcionesMadrid,
      })
      const horaInicio = inicio.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        ...opcionesMadrid,
      })
      const horaFin = fin.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        ...opcionesMadrid,
      })

      const nombreVecino =
        usuario.alias || `${usuario.nombre ?? ''} ${usuario.apellidos ?? ''}`.trim()

      await enviarEmailBrevo({
        to: { email: emailDestino, name: nombreVecino },
        subject: `Recordatorio: ${recurso?.nombre ?? 'tu reserva'} en 1 hora`,
        htmlContent: plantillaRecordatorioReserva({
          nombreVecino,
          nombreRecurso: recurso?.nombre ?? 'instalación',
          fechaLarga,
          horaInicio,
          horaFin,
          cruzaMedianoche,
          urlMisReservas: `${appUrl}/mis-reservas`,
          datosContacto: textoGeneral.data?.contenido ?? '',
        }),
      })

      // Marcar como enviado (error aquí no detiene el batch)
      const { error: updateError } = await supabase
        .from('reservas')
        .update({ recordatorio_enviado: true })
        .eq('id', reserva.id)

      if (updateError) {
        console.error(`Error marcando recordatorio_enviado para ${reserva.id}:`, updateError)
      }

      enviados++
    } catch (err) {
      console.error(`Error procesando reserva ${reserva.id}:`, err)
      errores++
    }
  }

  return respuesta(200, null, {
    procesadas: reservas.length,
    enviados,
    errores,
  })
})

function respuesta(status: number, mensaje: string | null, data?: unknown) {
  const body = mensaje ? { error: mensaje } : { ...(data as Record<string, unknown>) }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
