import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface GestionarUsuarioBody {
  usuario_id: string
  accion: 'verificar' | 'bloquear' | 'desbloquear' | 'cambiar_rol' | 'eliminar' | 'cambiar_email'
  motivo?: string
  nuevo_rol?: string
  nuevo_email?: string
  bloqueado_hasta?: string | null // ISO date, null = indefinido
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
      return respuesta(403, 'No tienes permiso para gestionar usuarios')
    }

    const callerComunidadId = perfil.comunidad_id

    // 3. Parsear body
    const body: GestionarUsuarioBody = await req.json()
    const { usuario_id, accion, motivo, nuevo_rol, nuevo_email, bloqueado_hasta } = body

    if (!usuario_id || !accion) {
      return respuesta(400, 'Faltan campos obligatorios: usuario_id, accion')
    }

    // 4. Cargar usuario objetivo
    const { data: objetivo } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuario_id)
      .single()

    if (!objetivo) {
      return respuesta(403, 'No autorizado')
    }

    // 5. Filtro de comunidad: objetivo debe pertenecer a la misma comunidad
    if (objetivo.comunidad_id !== callerComunidadId) {
      return respuesta(403, 'No autorizado')
    }

    // 6. Ejecutar acción
    let detalle: Record<string, unknown> = {}

    switch (accion) {
      case 'verificar': {
        if (objetivo.estado !== 'pendiente') {
          return respuesta(409, 'El usuario no está en estado pendiente')
        }
        const { error: err } = await supabase
          .from('usuarios')
          .update({ estado: 'activo' })
          .eq('id', usuario_id)
        if (err) return respuesta(500, 'Error al verificar usuario')
        detalle = { estado_previo: 'pendiente', estado_nuevo: 'activo' }
        break
      }

      case 'bloquear': {
        if (objetivo.estado === 'bloqueado') {
          return respuesta(409, 'El usuario ya está bloqueado')
        }
        const estadoPrevioBloqueo = objetivo.estado
        const { error: err } = await supabase
          .from('usuarios')
          .update({
            estado: 'bloqueado',
            bloqueado_hasta: bloqueado_hasta || null,
          })
          .eq('id', usuario_id)
        if (err) return respuesta(500, 'Error al bloquear usuario')
        detalle = {
          estado_previo: estadoPrevioBloqueo,
          motivo: motivo || null,
          bloqueado_hasta: bloqueado_hasta || 'indefinido',
        }
        break
      }

      case 'desbloquear': {
        if (objetivo.estado !== 'bloqueado') {
          return respuesta(409, 'El usuario no está bloqueado')
        }
        // Buscar estado previo en el log de la última acción de bloqueo
        let estadoRestaurar = 'activo'
        const { data: logBloqueo } = await supabase
          .from('logs_admin')
          .select('detalle')
          .eq('target_id', usuario_id)
          .eq('accion', 'usuario_bloquear')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (logBloqueo?.detalle?.estado_previo) {
          estadoRestaurar = logBloqueo.detalle.estado_previo
        }
        // Evitar ciclo: si el estado previo era bloqueado, poner activo
        if (estadoRestaurar === 'bloqueado') {
          estadoRestaurar = 'activo'
        }
        const { error: err2 } = await supabase
          .from('usuarios')
          .update({ estado: estadoRestaurar, bloqueado_hasta: null })
          .eq('id', usuario_id)
        if (err2) return respuesta(500, 'Error al desbloquear usuario')
        detalle = { estado_previo: 'bloqueado', estado_nuevo: estadoRestaurar }
        break
      }

      case 'cambiar_rol': {
        if (!nuevo_rol) {
          return respuesta(400, 'Falta el campo nuevo_rol')
        }
        // Solo super_admin puede cambiar a/desde admin/super_admin
        if (
          (['admin', 'super_admin'].includes(nuevo_rol) ||
            ['admin', 'super_admin'].includes(objetivo.rol)) &&
          perfil.rol !== 'super_admin'
        ) {
          return respuesta(403, 'Solo un super_admin puede cambiar roles de administración')
        }
        if (objetivo.rol === 'super_admin' && perfil.rol !== 'super_admin') {
          return respuesta(403, 'No puedes modificar a un super_admin')
        }
        const { error: err } = await supabase
          .from('usuarios')
          .update({ rol: nuevo_rol })
          .eq('id', usuario_id)
        if (err) return respuesta(500, 'Error al cambiar rol')
        detalle = { rol_previo: objetivo.rol, rol_nuevo: nuevo_rol }
        break
      }

      case 'eliminar': {
        if (perfil.rol !== 'super_admin') {
          return respuesta(403, 'Solo un super_admin puede eliminar usuarios')
        }
        if (objetivo.rol === 'super_admin') {
          return respuesta(403, 'No se puede eliminar a un super_admin')
        }

        const { error: delError } = await supabase
          .from('usuarios')
          .delete()
          .eq('id', usuario_id)

        if (delError) {
          console.error('Error eliminando usuario:', delError)
          return respuesta(500, 'Error al eliminar usuario: ' + delError.message)
        }

        try {
          await supabase.auth.admin.deleteUser(usuario_id)
        } catch {
          // No pasa nada si no tiene usuario auth
        }

        detalle = { nombre: objetivo.nombre, apellidos: objetivo.apellidos, rol: objetivo.rol }
        break
      }

      case 'cambiar_email': {
        if (perfil.rol !== 'super_admin') {
          return respuesta(403, 'Solo un super_admin puede cambiar el email')
        }
        if (!nuevo_email?.trim()) {
          return respuesta(400, 'Falta el campo nuevo_email')
        }
        const emailLimpio = nuevo_email.trim().toLowerCase()

        // Verificar que el email no está en uso
        const { data: existente } = await supabase.auth.admin.listUsers()
        const emailEnUso = existente?.users?.some(
          (u) => u.email?.toLowerCase() === emailLimpio && u.id !== usuario_id
        )
        if (emailEnUso) {
          return respuesta(409, 'Email ya en uso por otro usuario')
        }

        // Obtener email antiguo
        const { data: authUser } = await supabase.auth.admin.getUserById(usuario_id)
        const emailAntiguo = authUser?.user?.email || 'desconocido'

        // Actualizar email en auth
        const { error: updateErr } = await supabase.auth.admin.updateUserById(usuario_id, {
          email: emailLimpio,
          email_confirm: true,
        })
        if (updateErr) {
          console.error('Error actualizando email:', updateErr)
          return respuesta(500, 'Error al cambiar el email: ' + updateErr.message)
        }

        // Invalidar sesiones del usuario
        try {
          await supabase.auth.admin.signOut(usuario_id)
        } catch {
          // No pasa nada si falla
        }

        // Generar magic link para el nuevo email
        try {
          await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: emailLimpio,
          })
        } catch (linkErr) {
          console.error('Error generando magic link:', linkErr)
        }

        detalle = { email_anterior: emailAntiguo, email_nuevo: emailLimpio }
        break
      }

      default:
        return respuesta(400, 'Acción no reconocida: ' + accion)
    }

    // 7. Log
    await supabase.from('logs_admin').insert({
      comunidad_id: callerComunidadId,
      admin_id: user.id,
      accion: `usuario_${accion}`,
      target_tipo: 'usuario',
      target_id: usuario_id,
      detalle,
    })

    const resultado: Record<string, unknown> = { accion }
    if (accion === 'verificar') resultado.estado = 'activo'
    if (accion === 'bloquear') resultado.estado = 'bloqueado'
    if (accion === 'desbloquear') resultado.estado = detalle.estado_nuevo
    if (accion === 'cambiar_rol') resultado.rol = nuevo_rol
    if (accion === 'cambiar_email') resultado.email = nuevo_email

    return respuesta(200, null, resultado)
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
