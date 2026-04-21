import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { enviarEmailBrevo, plantillaReservaCancelada } from '../_shared/emails.ts'

interface CancelarReservaBody {
  reserva_id: string
  motivo?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return respuesta(401, 'No se ha proporcionado token de autenticación')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return respuesta(401, 'Token no válido')
    }

    const body: CancelarReservaBody = await req.json()
    const { reserva_id, motivo } = body

    if (!reserva_id) {
      return respuesta(400, 'Falta reserva_id')
    }

    // 2. Cargar reserva
    const { data: reserva } = await supabase
      .from('reservas')
      .select('*, recursos(*)')
      .eq('id', reserva_id)
      .maybeSingle()

    if (!reserva) {
      return respuesta(404, 'Reserva no encontrada')
    }

    if (!['confirmada', 'pendiente_pago', 'pagado'].includes(reserva.estado)) {
      return respuesta(409, 'Esta reserva no se puede cancelar (estado actual: ' + reserva.estado + ')')
    }

    // 3. Permisos
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    const esPropia = reserva.usuario_id === user.id
    const esPrivilegiado = perfil && ['guarda', 'admin', 'super_admin'].includes(perfil.rol)

    if (!esPropia && !esPrivilegiado) {
      return respuesta(403, 'No tienes permiso para cancelar esta reserva')
    }

    // 4. Calcular si es cancelación tardía
    const config = reserva.recursos?.config as Record<string, unknown> | undefined
    const minutosLimite = (config?.minutos_para_cancelar_sin_penalizacion as number) || 30
    const minutosHastaReserva = (new Date(reserva.inicio).getTime() - Date.now()) / 60000
    const fueTardia = minutosHastaReserva < minutosLimite

    // 5. UPDATE
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        estado: 'cancelada',
        cancelado_en: new Date().toISOString(),
        cancelado_por: user.id,
        motivo_cancelacion: motivo || 'Cancelación del usuario',
        cancelo_tarde: fueTardia,
      })
      .eq('id', reserva_id)

    if (updateError) {
      console.error('Error cancelando reserva:', updateError)
      return respuesta(500, 'Error al cancelar la reserva')
    }

    // 6. Email al dueño si quien cancela es otro (best effort — no falla si el email falla)
    if (!esPropia && reserva.usuario_id) {
      try {
        const [authUserResult, perfilDuenoResult, textoContactoResult] = await Promise.all([
          supabase.auth.admin.getUserById(reserva.usuario_id),
          supabase.from('usuarios').select('nombre, apellidos').eq('id', reserva.usuario_id).maybeSingle(),
          supabase.from('textos_admin').select('contenido')
            .eq('clave', 'contacto_general')
            .eq('comunidad_id', reserva.comunidad_id)
            .maybeSingle(),
        ])

        const emailDueno = authUserResult.data.user?.email
        const perfilDueno = perfilDuenoResult.data

        if (emailDueno && perfilDueno) {
          const inicio = new Date(reserva.inicio)
          const fin = new Date(reserva.fin)
          const opcionesMadrid = { timeZone: 'Europe/Madrid' } as const
          const fechaLarga = inicio.toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...opcionesMadrid,
          })
          const horaInicio = inicio.toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit', ...opcionesMadrid,
          })
          const horaFin = fin.toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit', ...opcionesMadrid,
          })
          const cruzaMedianoche =
            inicio.toLocaleDateString('es-ES', opcionesMadrid) !==
            fin.toLocaleDateString('es-ES', opcionesMadrid)

          const rolCancelador = perfil?.rol ?? ''
          const canceladoPor = ['admin', 'super_admin'].includes(rolCancelador)
            ? 'la administración'
            : 'el vigilante'

          const html = plantillaReservaCancelada({
            nombreVecino: `${perfilDueno.nombre} ${perfilDueno.apellidos}`,
            nombreRecurso: reserva.recursos?.nombre ?? 'el recurso',
            fechaLarga,
            horaInicio,
            horaFin,
            cruzaMedianoche,
            motivoCancelacion: motivo || 'Cancelación por administración',
            canceladoPor,
            datosContacto: textoContactoResult.data?.contenido ?? '',
          })
          const emailResult = await enviarEmailBrevo({
            to: {
              email: emailDueno,
              name: `${perfilDueno.nombre} ${perfilDueno.apellidos}`,
            },
            subject: `Reserva cancelada — ${reserva.recursos?.nombre ?? 'recurso'}`,
            htmlContent: html,
          })
          console.log('Email cancelación reserva:', emailResult)
        }
      } catch (emailErr) {
        console.error('Error enviando email cancelación:', emailErr)
      }
    }

    // 7. Respuesta
    return respuesta(200, null, { fue_tardia: fueTardia })
  } catch (err) {
    console.error('Error inesperado:', err)
    return respuesta(500, 'Error inesperado. Inténtalo de nuevo.')
  }
})

function respuesta(status: number, mensaje: string | null, data?: unknown) {
  const body = mensaje
    ? { error: mensaje }
    : { ...data as Record<string, unknown> }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
