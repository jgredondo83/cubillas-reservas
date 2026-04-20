import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RegistrarPagoBody {
  reserva_id: string
  cantidad_euros: number
  fianza_euros?: number
  metodo: 'efectivo' | 'bizum' | 'transferencia' | 'otros'
  referencia?: string
}

const METODOS_VALIDOS = ['efectivo', 'bizum', 'transferencia', 'otros']

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

    // 2. Verificar caller es admin/super_admin
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, comunidad_id')
      .eq('id', user.id)
      .single()

    if (!perfil || !['admin', 'super_admin'].includes(perfil.rol)) {
      return respuesta(403, 'Solo administradores pueden registrar pagos')
    }

    // 3. Parsear body
    const body: RegistrarPagoBody = await req.json()
    const { reserva_id, cantidad_euros, fianza_euros, metodo, referencia } = body

    if (!reserva_id || cantidad_euros == null || !metodo) {
      return respuesta(400, 'Faltan campos obligatorios: reserva_id, cantidad_euros, metodo')
    }

    if (!METODOS_VALIDOS.includes(metodo)) {
      return respuesta(400, `Método no válido. Opciones: ${METODOS_VALIDOS.join(', ')}`)
    }

    if (cantidad_euros < 0) {
      return respuesta(400, 'La cantidad no puede ser negativa')
    }

    // Si método es "otros", referencia es obligatoria
    if (metodo === 'otros' && !referencia?.trim()) {
      return respuesta(400, 'El campo referencia es obligatorio cuando el método es "otros"')
    }

    // 4. Cargar reserva y verificar estado + comunidad
    const { data: reserva } = await supabase
      .from('reservas')
      .select('id, estado, comunidad_id, recurso_id, usuario_id, vivienda_id')
      .eq('id', reserva_id)
      .eq('comunidad_id', perfil.comunidad_id)
      .single()

    if (!reserva) {
      return respuesta(404, 'Reserva no encontrada')
    }

    if (reserva.estado !== 'pendiente_pago') {
      return respuesta(400, `No se puede registrar pago: la reserva está en estado "${reserva.estado}". Solo se puede pagar reservas en estado "pendiente_pago".`)
    }

    // 5. Construir datos_pago
    const datosPago = {
      cantidad_euros,
      fianza_euros: fianza_euros ?? 0,
      metodo,
      referencia: referencia?.trim() || null,
      registrado_por: user.id,
      registrado_en: new Date().toISOString(),
    }

    // 6. Actualizar reserva: estado → pagado, guardar datos_pago
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        estado: 'pagado',
        datos_pago: datosPago,
      })
      .eq('id', reserva_id)

    if (updateError) {
      console.error('Error actualizando reserva:', updateError)
      return respuesta(500, 'Error al registrar el pago')
    }

    // 7. Log
    await supabase.from('logs_admin').insert({
      comunidad_id: perfil.comunidad_id,
      admin_id: user.id,
      accion: 'registrar_pago',
      target_tipo: 'reserva',
      target_id: reserva_id,
      detalle: datosPago,
    })

    return respuesta(200, null, { estado: 'pagado', datos_pago: datosPago })
  } catch (err) {
    console.error('Error inesperado:', err)
    return respuesta(500, 'Error inesperado. Inténtalo de nuevo.')
  }
})

function respuesta(status: number, mensaje: string | null, data?: unknown) {
  const body = mensaje
    ? { error: mensaje }
    : { ...(data as Record<string, unknown>) }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
