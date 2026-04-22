// eliminar-cuenta/index.ts
// RGPD — Derecho al olvido (Art. 17 RGPD).
// Desplegado con --no-verify-jwt; verificación manual con verificarJWT().
// FAIL-CLOSED para admin/super_admin: no pueden auto-eliminarse.
//
// Flujo (en orden para garantizar consistencia):
//   1. Verificar JWT manualmente
//   2. Leer perfil + FAIL-CLOSED admin/super_admin
//   3. Leer email desde auth (lo necesitamos antes de borrar al usuario)
//   4. Leer contacto_administracion (para el email)
//   5. Cancelar reservas futuras (liberar franjas)
//   6. Insertar log en logs_admin ANTES del DELETE (post-DELETE falla por RLS/FK)
//   7. Eliminar registro en tabla usuarios (SET NULL en FKs via mig 024)
//   8. Eliminar usuario de auth
//   9. Enviar email de confirmación (fire-and-forget; solo si la eliminación fue OK)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { verificarJWT } from '../_shared/auth.ts'
import { enviarEmailBrevo, plantillaCuentaEliminada } from '../_shared/emails.ts'

const COMUNIDAD_ID = '00000000-0000-0000-0000-000000000001'

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

  // 1. Verificar JWT
  const auth = await verificarJWT(req, supabaseAdmin)
  if (auth.error) return respuesta(auth.status, { error: auth.error })
  const { user } = auth

  // 2. Obtener perfil del usuario
  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellidos, rol, comunidad_id')
    .eq('id', user.id)
    .single()

  if (perfilError || !perfil) {
    return respuesta(404, { error: 'Usuario no encontrado' })
  }

  // FAIL-CLOSED: admin y super_admin no pueden auto-eliminarse
  if (perfil.rol === 'admin' || perfil.rol === 'super_admin') {
    return respuesta(403, { error: 'Los administradores no pueden auto-eliminar su cuenta. Contacta con otro administrador.' })
  }

  const nombreVecino = `${perfil.nombre} ${perfil.apellidos}`.trim()
  const comunidadId = perfil.comunidad_id ?? COMUNIDAD_ID

  // 3. Leer email desde auth AHORA (tras el DELETE ya no existirá)
  const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(user.id)
  if (authUserError || !authUser?.user?.email) {
    return respuesta(500, { error: 'No se pudo obtener el email del usuario' })
  }
  const email = authUser.user.email

  // 4. Leer contacto_administracion para el email de confirmación
  const { data: textoContacto } = await supabaseAdmin
    .from('textos_admin')
    .select('contenido')
    .eq('comunidad_id', comunidadId)
    .eq('clave', 'contacto_administracion')
    .maybeSingle()

  const datosContactoAdmin = textoContacto?.contenido ?? ''

  // 5. Cancelar reservas futuras (para liberar franjas)
  const ahora = new Date().toISOString()
  const { error: cancelError } = await supabaseAdmin
    .from('reservas')
    .update({
      estado: 'cancelada',
      cancelado_en: ahora,
      motivo_cancelacion: 'Cuenta eliminada por el titular (RGPD)',
    })
    .eq('usuario_id', user.id)
    .in('estado', ['confirmada', 'pendiente_pago', 'pagado'])
    .gt('inicio', ahora)

  if (cancelError) {
    console.error('Error cancelando reservas futuras:', cancelError)
    return respuesta(500, { error: 'Error al cancelar reservas pendientes' })
  }

  // 6. Insertar log ANTES del DELETE
  // admin_id = el propio vecino (quien solicita); target_id = NULL porque se borrará inmediatamente.
  // Se hace con supabaseAdmin para saltarse RLS (tras el DELETE el user ya no existiría).
  await supabaseAdmin.from('logs_admin').insert({
    comunidad_id: comunidadId,
    admin_id: user.id,
    target_tipo: 'usuario',
    target_id: user.id, // aún existe en este momento
    accion: 'cuenta_eliminada_rgpd',
    detalle: {
      nombre: nombreVecino,
      email,
      motivo: 'Auto-eliminación por el vecino (RGPD Art. 17)',
    },
  })

  // 7. Eliminar registro en tabla usuarios
  // Las FKs con ON DELETE SET NULL (mig 024) anonimi las reservas pasadas automáticamente.
  const { error: deleteUsuarioError } = await supabaseAdmin
    .from('usuarios')
    .delete()
    .eq('id', user.id)

  if (deleteUsuarioError) {
    console.error('Error eliminando usuario de la tabla:', deleteUsuarioError)
    return respuesta(500, { error: 'Error al eliminar los datos del usuario' })
  }

  // 8. Eliminar usuario de auth
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteAuthError) {
    // El registro en usuarios ya fue borrado; no hay rollback posible. Solo logueamos.
    console.error('Error eliminando usuario de auth (tabla ya borrada):', deleteAuthError)
  }

  // 9. Enviar email de confirmación — fire-and-forget, solo si eliminación OK
  // No esperamos el resultado para no bloquear la respuesta HTTP.
  const fechaEliminacion = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  enviarEmailBrevo({
    to: { email, name: nombreVecino },
    subject: 'Tu cuenta ha sido eliminada — Reservas Parque del Cubillas',
    htmlContent: plantillaCuentaEliminada({ nombreVecino, fechaEliminacion, datosContactoAdmin }),
  }).catch((err) => console.error('Error enviando email cuenta eliminada:', err))

  return respuesta(200, { ok: true })
})
