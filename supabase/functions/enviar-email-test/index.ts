import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  enviarEmailBrevo,
  plantillaReservaConfirmada,
  plantillaRecordatorioReserva,
  plantillaReservaCancelada,
} from '../_shared/emails.ts'

interface TestEmailBody {
  to: string
  tipo?: 'confirmada' | 'recordatorio' | 'cancelada'
}

const APP_URL = Deno.env.get('APP_URL') ?? 'https://cubillas-reservas.vercel.app'
const URL_MIS_RESERVAS = `${APP_URL}/mis-reservas`

const DATOS_CONTACTO_DEMO =
  'Administración Parque del Cubillas\nTel: 958 000 000 · Horario: lun-vie 9:00-14:00\nadmin@cubillas.example'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth: solo usuarios autenticados
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return respuesta(401, 'No se ha proporcionado token de autenticación')
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return respuesta(401, 'Token no válido')
    }

    const body: TestEmailBody = await req.json()
    const { to, tipo } = body

    if (!to || !to.includes('@')) {
      return respuesta(400, 'Falta campo "to" con un email válido')
    }

    let subject: string
    let htmlContent: string

    if (!tipo) {
      // Email simple de test
      subject = 'Test de email — Reservas Parque del Cubillas'
      htmlContent = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:32px;">
        <h2 style="color:#0d9488;">&#10003; Todo funciona correctamente</h2>
        <p>El sistema de emails transaccionales de <strong>Reservas Parque del Cubillas</strong> está operativo.</p>
        <p style="color:#64748b;font-size:12px;">Este es un mensaje de prueba generado desde la función <code>enviar-email-test</code>.</p>
      </body></html>`
    } else if (tipo === 'confirmada') {
      subject = 'Reserva confirmada — Pista de Pádel 1 [DEMO]'
      htmlContent = plantillaReservaConfirmada({
        nombreVecino: 'Ana García López',
        nombreRecurso: 'Pista de Pádel 1',
        fechaLarga: 'viernes, 25 de abril de 2026',
        horaInicio: '18:00',
        horaFin: '19:30',
        cruzaMedianoche: false,
        estado: 'confirmada',
        urlMisReservas: URL_MIS_RESERVAS,
        datosContacto: DATOS_CONTACTO_DEMO,
      })
    } else if (tipo === 'confirmada_pago') {
      // tipo extra para probar el bloque amber (acepta cualquier string en el body)
      subject = 'Reserva pendiente de pago — Club Social 6 horas [DEMO]'
      htmlContent = plantillaReservaConfirmada({
        nombreVecino: 'Carlos Ruiz Moreno',
        nombreRecurso: 'Club Social 6 horas',
        fechaLarga: 'sábado, 26 de abril de 2026',
        horaInicio: '18:00',
        horaFin: '00:00',
        cruzaMedianoche: true,
        estado: 'pendiente_pago',
        urlMisReservas: URL_MIS_RESERVAS,
        costeEuros: 40,
        fianzaEuros: 210,
        datosContacto: DATOS_CONTACTO_DEMO,
      })
    } else if (tipo === 'recordatorio') {
      subject = 'Recordatorio: reserva en Pista de Tenis en 1 hora [DEMO]'
      htmlContent = plantillaRecordatorioReserva({
        nombreVecino: 'Ana García López',
        nombreRecurso: 'Pista de Tenis',
        fechaLarga: 'sábado, 26 de abril de 2026',
        horaInicio: '10:00',
        horaFin: '11:30',
        cruzaMedianoche: false,
        urlMisReservas: URL_MIS_RESERVAS,
        datosContacto: DATOS_CONTACTO_DEMO,
      })
    } else if (tipo === 'cancelada') {
      subject = 'Reserva cancelada — Pista de Pádel 1 [DEMO]'
      htmlContent = plantillaReservaCancelada({
        nombreVecino: 'Ana García López',
        nombreRecurso: 'Pista de Pádel 1',
        fechaLarga: 'viernes, 25 de abril de 2026',
        horaInicio: '18:00',
        horaFin: '19:30',
        cruzaMedianoche: false,
        motivoCancelacion: 'Mantenimiento urgente de la pista',
        canceladoPor: 'la administración',
        datosContacto: DATOS_CONTACTO_DEMO,
      })
    } else {
      return respuesta(400, 'tipo no válido. Usa: confirmada, recordatorio, cancelada (o omite para test básico)')
    }

    const resultado = await enviarEmailBrevo({ to: { email: to }, subject, htmlContent })

    if (!resultado.ok) {
      return respuesta(500, `Error enviando email: ${resultado.error}`)
    }

    return respuesta(200, null, { enviado: true, to, tipo: tipo ?? 'test', subject })
  } catch (err) {
    console.error('Error inesperado:', err)
    return respuesta(500, 'Error inesperado. Inténtalo de nuevo.')
  }
})

function respuesta(status: number, mensaje: string | null, data?: unknown) {
  const body = mensaje ? { error: mensaje } : { ...data as Record<string, unknown> }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
