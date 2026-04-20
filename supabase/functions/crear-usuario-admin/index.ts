import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CrearUsuarioBody {
  nombre: string
  apellidos: string
  alias?: string
  telefono: string
  email: string
  vivienda_id: string
  rol?: string
  activar_cuenta?: boolean
  nivel_padel?: string
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

    // 2. Verificar caller es admin/super_admin
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, comunidad_id')
      .eq('id', user.id)
      .single()

    if (!perfil || !['admin', 'super_admin'].includes(perfil.rol)) {
      return respuesta(403, 'No tienes permiso para crear usuarios')
    }

    const callerComunidadId = perfil.comunidad_id

    // 3. Parsear body — email es obligatorio
    const body: CrearUsuarioBody = await req.json()
    const { nombre, apellidos, alias, telefono, email, vivienda_id, rol = 'vecino', activar_cuenta = true, nivel_padel } = body

    if (!nombre?.trim() || !apellidos?.trim() || !telefono?.trim() || !email?.trim() || !vivienda_id) {
      return respuesta(400, 'Faltan campos obligatorios: nombre, apellidos, telefono, email, vivienda_id')
    }

    // Solo super_admin puede crear admin/super_admin
    if (['admin', 'super_admin'].includes(rol) && perfil.rol !== 'super_admin') {
      return respuesta(403, 'Solo un super_admin puede asignar rol admin o superior')
    }

    // 4. Verificar vivienda existe y pertenece a la comunidad del caller
    const { data: vivienda } = await supabase
      .from('viviendas')
      .select('id')
      .eq('id', vivienda_id)
      .eq('comunidad_id', callerComunidadId)
      .single()

    if (!vivienda) {
      return respuesta(404, 'Vivienda no encontrada')
    }

    // 5. Verificar que el email no existe ya en auth.users
    const { data: listData } = await supabase.auth.admin.listUsers()
    const emailExiste = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    )
    if (emailExiste) {
      return respuesta(409, 'Ya existe un usuario con ese email')
    }

    // 6. inviteUserByEmail — crea auth.users Y envía email de invitación en una llamada
    const appUrl = Deno.env.get('APP_URL') ?? 'https://cubillas-reservas.vercel.app'
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email.trim(),
      {
        redirectTo: `${appUrl}/auth/callback`,
        data: { invited_by: 'admin_panel', admin_id: user.id },
      }
    )

    if (inviteError) {
      console.error('Error invitando usuario:', inviteError)
      return respuesta(500, 'Error enviando invitación: ' + inviteError.message)
    }

    // 7. Usar el ID que auth.users generó — NO generar UUID propio
    const authUserId = inviteData.user.id
    console.log('Usuario invitado OK, auth.users.id:', authUserId, 'email:', email.trim())

    // 8. Insertar perfil en public.usuarios con el MISMO ID de auth.users
    const estado = activar_cuenta ? 'activo' : 'pendiente'

    const { data: nuevoUsuario, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        id: authUserId,
        comunidad_id: callerComunidadId,
        vivienda_id,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        alias: alias?.trim() || null,
        telefono: telefono.trim(),
        rol,
        estado,
        ...(nivel_padel ? { nivel_padel } : {}),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error insertando perfil:', insertError)
      // Limpiar auth.users si falla el perfil
      await supabase.auth.admin.deleteUser(authUserId)
      return respuesta(500, 'Error al crear el perfil: ' + insertError.message)
    }

    // 9. Log
    await supabase.from('logs_admin').insert({
      comunidad_id: callerComunidadId,
      admin_id: user.id,
      accion: 'crear_usuario',
      target_tipo: 'usuario',
      target_id: authUserId,
      detalle: { nombre: nombre.trim(), apellidos: apellidos.trim(), email: email.trim(), rol, estado, vivienda_id },
    })

    return respuesta(200, null, { usuario: nuevoUsuario })
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
