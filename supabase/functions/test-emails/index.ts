import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  enviarEmailBrevo,
  plantillaReservaConfirmada,
  plantillaRecordatorioReserva,
  plantillaReservaCancelada,
} from '../_shared/emails.ts'

interface TestEmailsBody {
  tipo: 'simple' | 'confirmada' | 'recordatorio' | 'cancelada'
  destinatario: string
}

const APP_URL = Deno.env.get('APP_URL') ?? 'https://cubillas-reservas.vercel.app'
const URL_MIS_RESERVAS = `${APP_URL}/mis-reservas`
const DATOS_CONTACTO_FALLBACK =
  'Administración Parque del Cubillas\nTel: 958 000 000 · Horario: lun-vie 9:00-14:00\nadmin@cubillas.example'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    // Solo super_admin
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, comunidad_id')
      .eq('id', user.id)
      .single()

    if (perfil?.rol !== 'super_admin') {
      return respuesta(403, 'Solo super_admin puede usar esta herramienta')
    }

    // Cargar contacto_general desde BD (fallback a demo si no existe)
    const { data: textoGeneral } = await supabase
      .from('textos_admin')
      .select('contenido')
      .eq('clave', 'contacto_general')
      .eq('comunidad_id', perfil.comunidad_id)
      .maybeSingle()
    const datosContacto = textoGeneral?.contenido ?? DATOS_CONTACTO_FALLBACK

    const body: TestEmailsBody = await req.json()
    const { tipo, destinatario } = body

    if (!destinatario || !destinatario.includes('@')) {
      return respuesta(400, 'Falta campo "destinatario" con un email válido')
    }
    if (!['simple', 'confirmada', 'recordatorio', 'cancelada'].includes(tipo)) {
      return respuesta(400, 'tipo debe ser: simple, confirmada, recordatorio o cancelada')
    }

    let subject: string
    let htmlContent: string

    if (tipo === 'simple') {
      subject = 'Test de email — Reservas Parque del Cubillas'
      htmlContent = `<!DOCTYPE html><html lang="es"><body style="font-family:system-ui,sans-serif;padding:32px;background:#f8fafc;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:32px;">
          <p style="margin:0 0 8px;font-size:24px;">&#10003;</p>
          <h2 style="margin:0 0 12px;color:#0d9488;font-size:20px;">Todo funciona correctamente</h2>
          <p style="margin:0 0 16px;color:#374151;">El sistema de emails transaccionales de <strong>Reservas Parque del Cubillas</strong> está operativo.</p>
          <p style="margin:0;color:#94a3b8;font-size:12px;">Mensaje de prueba generado desde el panel de super_admin.</p>
        </div>
      </body></html>`
    } else if (tipo === 'confirmada') {
      subject = 'Reserva confirmada — Pista de Pádel 1 [TEST]'
      htmlContent = plantillaReservaConfirmada({
        nombreVecino: 'Ana García López',
        nombreRecurso: 'Pista de Pádel 1',
        fechaLarga: 'viernes, 25 de abril de 2026',
        horaInicio: '18:00',
        horaFin: '19:30',
        cruzaMedianoche: false,
        estado: 'confirmada',
        urlMisReservas: URL_MIS_RESERVAS,
        datosContacto: datosContacto,
      })
    } else if (tipo === 'recordatorio') {
      subject = 'Recordatorio: reserva en Pista de Tenis en 1 hora [TEST]'
      htmlContent = plantillaRecordatorioReserva({
        nombreVecino: 'Carlos Ruiz Moreno',
        nombreRecurso: 'Pista de Tenis',
        fechaLarga: 'sábado, 26 de abril de 2026',
        horaInicio: '10:00',
        horaFin: '11:30',
        cruzaMedianoche: false,
        urlMisReservas: URL_MIS_RESERVAS,
        datosContacto: datosContacto,
      })
    } else {
      // cancelada
      subject = 'Reserva cancelada — Club Social 6 horas [TEST]'
      htmlContent = plantillaReservaCancelada({
        nombreVecino: 'Ana García López',
        nombreRecurso: 'Club Social 6 horas',
        fechaLarga: 'sábado, 26 de abril de 2026',
        horaInicio: '18:00',
        horaFin: '00:00',
        cruzaMedianoche: true,
        motivoCancelacion: 'Mantenimiento urgente del local',
        canceladoPor: 'la administración',
        datosContacto: datosContacto,
      })
    }

    const resultado = await enviarEmailBrevo({ to: { email: destinatario }, subject, htmlContent })

    if (!resultado.ok) {
      return respuesta(500, resultado.error ?? 'Error enviando email')
    }

    return respuesta(200, null, { ok: true, destinatario, tipo })
  } catch (err) {
    console.error('Error inesperado test-emails:', err)
    return respuesta(500, 'Error inesperado')
  }
})

function respuesta(status: number, mensaje: string | null, data?: unknown) {
  const body = mensaje ? { error: mensaje } : { ...data as Record<string, unknown> }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
