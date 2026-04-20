import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface GestionarViviendaBody {
  vivienda_id?: string
  accion: 'bloquear' | 'desbloquear' | 'crear' | 'eliminar'
  motivo?: string
  // Campos para crear
  referencia?: string
  bloque?: string
  numero?: string
  letra?: string
  planta?: string
  nota_admin?: string
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

    // 2. Obtener perfil del caller (rol + comunidad_id)
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, comunidad_id')
      .eq('id', user.id)
      .single()

    if (!perfil || !['admin', 'super_admin'].includes(perfil.rol)) {
      return respuesta(403, 'No tienes permiso para gestionar viviendas')
    }

    const callerComunidadId = perfil.comunidad_id

    // 3. Parsear body
    const body: GestionarViviendaBody = await req.json()
    const { vivienda_id, accion, motivo, referencia, bloque, numero, letra, planta, nota_admin } = body

    if (!accion) {
      return respuesta(400, 'Falta campo obligatorio: accion')
    }

    let detalle: Record<string, unknown> = {}
    let targetId = vivienda_id || ''

    // --- CREAR ---
    if (accion === 'crear') {
      if (perfil.rol !== 'super_admin') {
        return respuesta(403, 'Solo un super_admin puede crear viviendas')
      }
      if (!referencia?.trim()) {
        return respuesta(400, 'Falta campo obligatorio: referencia')
      }

      // Verificar unicidad de referencia en la comunidad
      const { data: existente } = await supabase
        .from('viviendas')
        .select('id')
        .eq('comunidad_id', callerComunidadId)
        .eq('referencia', referencia.trim())
        .maybeSingle()

      if (existente) {
        return respuesta(409, 'Ya existe una vivienda con esa referencia en esta comunidad')
      }

      const { data: nueva, error: insertErr } = await supabase
        .from('viviendas')
        .insert({
          comunidad_id: callerComunidadId,
          referencia: referencia.trim(),
          bloque: bloque?.trim() || null,
          numero: numero?.trim() || null,
          letra: letra?.trim() || null,
          planta: planta?.trim() || null,
          nota_admin: nota_admin?.trim() || null,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('Error creando vivienda:', insertErr)
        return respuesta(500, 'Error al crear la vivienda: ' + insertErr.message)
      }

      targetId = nueva.id
      detalle = { referencia: referencia.trim(), bloque, numero, letra }

      await supabase.from('logs_admin').insert({
        comunidad_id: callerComunidadId,
        admin_id: user.id,
        accion: 'vivienda_crear',
        target_tipo: 'vivienda',
        target_id: targetId,
        detalle,
      })

      return respuesta(200, null, { accion, vivienda: nueva })
    }

    // --- Para el resto de acciones se necesita vivienda_id ---
    if (!vivienda_id) {
      return respuesta(400, 'Falta campo obligatorio: vivienda_id')
    }

    // 4. Cargar vivienda
    const { data: vivienda } = await supabase
      .from('viviendas')
      .select('*')
      .eq('id', vivienda_id)
      .single()

    if (!vivienda) {
      return respuesta(403, 'No autorizado')
    }

    // 5. Filtro de comunidad
    if (vivienda.comunidad_id !== callerComunidadId) {
      return respuesta(403, 'No autorizado')
    }

    // 6. Ejecutar acción
    if (accion === 'bloquear') {
      if (vivienda.bloqueada_por_impago) {
        return respuesta(409, 'La vivienda ya está bloqueada por impago')
      }
      const { error: err } = await supabase
        .from('viviendas')
        .update({
          bloqueada_por_impago: true,
          motivo_bloqueo: motivo || 'Bloqueada por impago',
        })
        .eq('id', vivienda_id)

      if (err) return respuesta(500, 'Error al bloquear vivienda')
      detalle = { referencia: vivienda.referencia, motivo: motivo || 'Bloqueada por impago' }
    } else if (accion === 'desbloquear') {
      if (!vivienda.bloqueada_por_impago) {
        return respuesta(409, 'La vivienda no está bloqueada')
      }
      const { error: err } = await supabase
        .from('viviendas')
        .update({
          bloqueada_por_impago: false,
          motivo_bloqueo: null,
        })
        .eq('id', vivienda_id)

      if (err) return respuesta(500, 'Error al desbloquear vivienda')
      detalle = { referencia: vivienda.referencia, motivo_previo: vivienda.motivo_bloqueo }
    } else if (accion === 'eliminar') {
      if (perfil.rol !== 'super_admin') {
        return respuesta(403, 'Solo un super_admin puede eliminar viviendas')
      }

      // Verificar que no tiene vecinos
      const { count } = await supabase
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('vivienda_id', vivienda_id)

      if ((count ?? 0) > 0) {
        return respuesta(409, 'No puedes eliminar una vivienda con vecinos registrados. Primero reasigna o elimina los vecinos.')
      }

      const { error: delErr } = await supabase
        .from('viviendas')
        .delete()
        .eq('id', vivienda_id)

      if (delErr) {
        console.error('Error eliminando vivienda:', delErr)
        return respuesta(500, 'Error al eliminar la vivienda: ' + delErr.message)
      }

      detalle = { referencia: vivienda.referencia }
    } else {
      return respuesta(400, 'Acción no reconocida: ' + accion)
    }

    // 7. Log
    await supabase.from('logs_admin').insert({
      comunidad_id: callerComunidadId,
      admin_id: user.id,
      accion: `vivienda_${accion}`,
      target_tipo: 'vivienda',
      target_id: vivienda_id,
      detalle,
    })

    return respuesta(200, null, {
      accion,
      ...(accion === 'bloquear' ? { bloqueada: true } : {}),
      ...(accion === 'desbloquear' ? { bloqueada: false } : {}),
    })
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
