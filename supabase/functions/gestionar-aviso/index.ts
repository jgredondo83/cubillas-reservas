// gestionar-aviso/index.ts
// Crea, actualiza o desactiva avisos globales del panel admin.
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
  if (req.method !== 'POST') return respuesta(405, { error: 'Método no permitido' })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Verificar JWT
  const auth = await verificarJWT(req, supabaseAdmin)
  if (auth.error) return respuesta(auth.status, { error: auth.error })
  const { user } = auth

  // 2. Verificar rol admin/super_admin
  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('usuarios')
    .select('rol, comunidad_id')
    .eq('id', user.id)
    .single()

  if (perfilError || !perfil) return respuesta(404, { error: 'Usuario no encontrado' })
  if (perfil.rol !== 'admin' && perfil.rol !== 'super_admin') {
    return respuesta(403, { error: 'Solo administradores pueden gestionar avisos' })
  }

  const comunidadId = perfil.comunidad_id

  // 3. Leer body
  let body: { accion?: string; aviso?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return respuesta(400, { error: 'Body JSON inválido' })
  }

  const { accion, aviso } = body
  if (!accion || !['crear', 'actualizar', 'desactivar'].includes(accion)) {
    return respuesta(400, { error: 'Acción inválida. Usa: crear | actualizar | desactivar' })
  }

  // ── CREAR ──────────────────────────────────────────────────────────────────
  if (accion === 'crear') {
    const { tipo, titulo, contenido, fecha_inicio, fecha_fin } = aviso ?? {}
    if (!tipo || !titulo || !contenido) {
      return respuesta(400, { error: 'Campos requeridos: tipo, titulo, contenido' })
    }
    if (!['info', 'advertencia', 'urgente'].includes(tipo as string)) {
      return respuesta(400, { error: 'tipo debe ser info | advertencia | urgente' })
    }

    // Desactivar cualquier aviso activo anterior
    await supabaseAdmin
      .from('avisos')
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq('comunidad_id', comunidadId)
      .eq('activo', true)

    // Insertar nuevo aviso
    const { data: nuevo, error: insertError } = await supabaseAdmin
      .from('avisos')
      .insert({
        comunidad_id: comunidadId,
        tipo,
        titulo,
        contenido,
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
        activo: true,
        creado_por: user.id,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creando aviso:', insertError)
      return respuesta(500, { error: 'Error al crear el aviso' })
    }

    await supabaseAdmin.from('logs_admin').insert({
      comunidad_id: comunidadId,
      admin_id: user.id,
      target_tipo: 'aviso',
      target_id: nuevo.id,
      accion: 'aviso_creado',
      detalle: { tipo, titulo },
    })

    return respuesta(200, { ok: true, aviso: nuevo })
  }

  // ── ACTUALIZAR ─────────────────────────────────────────────────────────────
  if (accion === 'actualizar') {
    const { id, tipo, titulo, contenido, fecha_inicio, fecha_fin } = aviso ?? {}
    if (!id) return respuesta(400, { error: 'Campo "id" requerido para actualizar' })
    if (!tipo || !titulo || !contenido) {
      return respuesta(400, { error: 'Campos requeridos: tipo, titulo, contenido' })
    }

    // Verificar que pertenece a esta comunidad
    const { data: existente } = await supabaseAdmin
      .from('avisos')
      .select('id')
      .eq('id', id)
      .eq('comunidad_id', comunidadId)
      .single()

    if (!existente) return respuesta(404, { error: 'Aviso no encontrado en esta comunidad' })

    const { error: updateError } = await supabaseAdmin
      .from('avisos')
      .update({
        tipo,
        titulo,
        contenido,
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('comunidad_id', comunidadId)

    if (updateError) {
      console.error('Error actualizando aviso:', updateError)
      return respuesta(500, { error: 'Error al actualizar el aviso' })
    }

    await supabaseAdmin.from('logs_admin').insert({
      comunidad_id: comunidadId,
      admin_id: user.id,
      target_tipo: 'aviso',
      target_id: id,
      accion: 'aviso_actualizado',
      detalle: { tipo, titulo },
    })

    return respuesta(200, { ok: true })
  }

  // ── DESACTIVAR ─────────────────────────────────────────────────────────────
  if (accion === 'desactivar') {
    const { id } = aviso ?? {}
    if (!id) return respuesta(400, { error: 'Campo "id" requerido para desactivar' })

    const { error: deactivateError } = await supabaseAdmin
      .from('avisos')
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq('id', id)
      .eq('comunidad_id', comunidadId)

    if (deactivateError) {
      console.error('Error desactivando aviso:', deactivateError)
      return respuesta(500, { error: 'Error al desactivar el aviso' })
    }

    await supabaseAdmin.from('logs_admin').insert({
      comunidad_id: comunidadId,
      admin_id: user.id,
      target_tipo: 'aviso',
      target_id: id,
      accion: 'aviso_desactivado',
      detalle: {},
    })

    return respuesta(200, { ok: true })
  }

  return respuesta(400, { error: 'Acción no reconocida' })
})
