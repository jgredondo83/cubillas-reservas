// actualizar-texto-admin/index.ts
// Actualiza el contenido de un texto editable desde el panel admin.
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

  // 2. Leer perfil y verificar rol admin/super_admin
  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('usuarios')
    .select('rol, comunidad_id')
    .eq('id', user.id)
    .single()

  if (perfilError || !perfil) return respuesta(404, { error: 'Usuario no encontrado' })
  if (perfil.rol !== 'admin' && perfil.rol !== 'super_admin') {
    return respuesta(403, { error: 'Solo administradores pueden editar textos del sistema' })
  }

  const comunidadId = perfil.comunidad_id

  // 3. Validar body
  let body: { clave?: string; contenido?: string }
  try {
    body = await req.json()
  } catch {
    return respuesta(400, { error: 'Body JSON inválido' })
  }

  const { clave, contenido } = body
  if (!clave || typeof clave !== 'string') return respuesta(400, { error: 'Campo "clave" requerido' })
  if (typeof contenido !== 'string') return respuesta(400, { error: 'Campo "contenido" requerido' })

  // 4. Verificar que la clave existe para esta comunidad
  const { data: textoExistente, error: textoError } = await supabaseAdmin
    .from('textos_admin')
    .select('id, clave')
    .eq('comunidad_id', comunidadId)
    .eq('clave', clave)
    .single()

  if (textoError || !textoExistente) {
    return respuesta(404, { error: `Texto con clave "${clave}" no encontrado para esta comunidad` })
  }

  // 5. Actualizar contenido
  const { error: updateError } = await supabaseAdmin
    .from('textos_admin')
    .update({ contenido, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('comunidad_id', comunidadId)
    .eq('clave', clave)

  if (updateError) {
    console.error('Error actualizando texto:', updateError)
    return respuesta(500, { error: 'Error al guardar el texto' })
  }

  // 6. Log en logs_admin
  await supabaseAdmin.from('logs_admin').insert({
    comunidad_id: comunidadId,
    admin_id: user.id,
    target_tipo: 'texto_admin',
    target_id: null,
    accion: 'texto_actualizado',
    detalle: { clave, longitud_contenido: contenido.length },
  })

  return respuesta(200, { ok: true, contenido_actualizado: contenido })
})
