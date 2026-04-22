// exportar-mis-datos/index.ts
// RGPD — Portabilidad de datos (Art. 20 RGPD).
// Desplegado con --no-verify-jwt; verificación manual con verificarJWT().

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { verificarJWT } from '../_shared/auth.ts'

function respuesta(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const auth = await verificarJWT(req, supabaseAdmin)
  if (auth.error) return respuesta(auth.status, { error: auth.error })
  const { user } = auth

  try {
    // 1. Datos del usuario
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('id, nombre, apellidos, alias, telefono, rol, estado, nivel_padel_autoevaluado, no_presentado_count_30d, bloqueado_hasta, consentimiento_privacidad_en, created_at, updated_at, vivienda_id, comunidad_id')
      .eq('id', user.id)
      .single()

    // 2. Vivienda
    const viviendaId = usuario?.vivienda_id
    const { data: vivienda } = viviendaId
      ? await supabaseAdmin
          .from('viviendas')
          .select('id, referencia, bloque, numero, letra, planta')
          .eq('id', viviendaId)
          .single()
      : { data: null }

    // 3. Reservas (sin datos_pago — campo excluido deliberadamente)
    const { data: reservas } = await supabaseAdmin
      .from('reservas')
      .select('id, recurso_id, inicio, fin, estado, notas, motivo_cancelacion, cancelado_en, cancelo_tarde, creado_en')
      .eq('usuario_id', user.id)
      .order('inicio', { ascending: false })

    // 4. Logs administrativos sobre este usuario
    const { data: logsAdmin } = await supabaseAdmin
      .from('logs_admin')
      .select('id, accion, detalle, created_at')
      .eq('target_id', user.id)
      .order('created_at', { ascending: false })

    const exportacion = {
      exportado_en: new Date().toISOString(),
      email: user.email,
      usuario: usuario ?? null,
      vivienda: vivienda ?? null,
      reservas: reservas ?? [],
      logs_sobre_mi: logsAdmin ?? [],
    }

    return respuesta(200, exportacion)
  } catch (err) {
    console.error('exportar-mis-datos error:', err)
    return respuesta(500, { error: 'Error interno al exportar datos' })
  }
})
