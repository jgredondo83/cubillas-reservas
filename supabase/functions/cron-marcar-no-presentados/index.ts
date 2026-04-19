import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verificar clave de cron (seguridad básica)
    const cronKey = req.headers.get('x-cron-key')
    const expectedKey = Deno.env.get('CRON_SECRET_KEY')

    if (expectedKey && cronKey !== expectedKey) {
      return respuesta(401, 'Clave de cron no válida')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Buscar reservas confirmadas/pendiente_pago cuyo fin < now() - 2 horas
    const limite = new Date()
    limite.setHours(limite.getHours() - 2)

    const { data: reservas, error } = await supabase
      .from('reservas')
      .select('id')
      .in('estado', ['confirmada', 'pendiente_pago'])
      .lt('fin', limite.toISOString())

    if (error) {
      console.error('Error buscando reservas:', error)
      return respuesta(500, 'Error al buscar reservas pasadas')
    }

    if (!reservas || reservas.length === 0) {
      return respuesta(200, null, { marcadas: 0, ids: [] })
    }

    const ids = reservas.map((r) => r.id)

    // Cambiar a pendiente_no_presentado (NO a no_presentado)
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        estado_previo: 'confirmada',
        estado: 'pendiente_no_presentado',
      })
      .in('id', ids)

    if (updateError) {
      console.error('Error actualizando reservas:', updateError)
      return respuesta(500, 'Error al marcar reservas')
    }

    return respuesta(200, null, { marcadas: ids.length, ids })
  } catch (err) {
    console.error('Error inesperado:', err)
    return respuesta(500, 'Error inesperado')
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
