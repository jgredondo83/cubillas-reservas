import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface MarcarAsistenciaBody {
  reserva_id: string
  resultado: 'presentado' | 'no_presentado' | 'deshacer'
  nota?: string
}

const UMBRAL_NO_PRESENTADOS = 2
const PENALIZACION_DIAS = 7

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

    // 2. Verificar rol privilegiado
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, nombre, apellidos')
      .eq('id', user.id)
      .single()

    if (!perfil || !['guarda', 'admin', 'super_admin'].includes(perfil.rol)) {
      return respuesta(403, 'No tienes permiso para marcar asistencia')
    }

    // 3. Parsear body
    const body: MarcarAsistenciaBody = await req.json()
    const { reserva_id, resultado, nota } = body

    if (!reserva_id || !resultado) {
      return respuesta(400, 'Faltan campos obligatorios: reserva_id, resultado')
    }

    if (!['presentado', 'no_presentado', 'deshacer'].includes(resultado)) {
      return respuesta(400, 'Resultado debe ser: presentado, no_presentado o deshacer')
    }

    // 4. Cargar reserva
    const { data: reserva } = await supabase
      .from('reservas')
      .select('*, recursos(*)')
      .eq('id', reserva_id)
      .maybeSingle()

    if (!reserva) {
      return respuesta(404, 'Reserva no encontrada')
    }

    // 5. Lógica según resultado
    if (resultado === 'deshacer') {
      // Solo se puede deshacer si está en estado de marcado
      if (!['completada', 'no_presentado', 'pendiente_no_presentado'].includes(reserva.estado)) {
        return respuesta(409, 'No hay marca que deshacer (estado actual: ' + reserva.estado + ')')
      }

      const estadoRestaurado = reserva.estado_previo || 'confirmada'

      // Si el estado actual era no_presentado, decrementar contador
      if (reserva.estado === 'no_presentado') {
        const { data: dueno } = await supabase
          .from('usuarios')
          .select('no_presentado_count_30d')
          .eq('id', reserva.usuario_id)
          .single()

        if (dueno) {
          await supabase
            .from('usuarios')
            .update({
              no_presentado_count_30d: Math.max(0, (dueno.no_presentado_count_30d || 0) - 1),
            })
            .eq('id', reserva.usuario_id)
        }
      }

      // Restaurar estado
      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          estado: estadoRestaurado,
          estado_previo: null,
          marcado_presentado_por: null,
          marcado_en: null,
        })
        .eq('id', reserva_id)

      if (updateError) {
        console.error('Error deshaciendo marca:', updateError)
        return respuesta(500, 'Error al deshacer la marca')
      }

      return respuesta(200, null, { estado: estadoRestaurado, accion: 'deshacer' })
    }

    if (resultado === 'presentado') {
      if (!['confirmada', 'pendiente_pago', 'pendiente_no_presentado'].includes(reserva.estado)) {
        return respuesta(409, 'No se puede marcar como presentado (estado actual: ' + reserva.estado + ')')
      }

      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          estado_previo: reserva.estado,
          estado: 'completada',
          marcado_presentado_por: user.id,
          marcado_en: new Date().toISOString(),
          ...(nota ? { notas: nota } : {}),
        })
        .eq('id', reserva_id)

      if (updateError) {
        console.error('Error marcando presentado:', updateError)
        return respuesta(500, 'Error al marcar como presentado')
      }

      return respuesta(200, null, { estado: 'completada', accion: 'presentado' })
    }

    if (resultado === 'no_presentado') {
      if (!['confirmada', 'pendiente_pago', 'pendiente_no_presentado'].includes(reserva.estado)) {
        return respuesta(409, 'No se puede marcar como no presentado (estado actual: ' + reserva.estado + ')')
      }

      // Guardar estado previo y actualizar
      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          estado_previo: reserva.estado,
          estado: 'no_presentado',
          marcado_presentado_por: user.id,
          marcado_en: new Date().toISOString(),
          ...(nota ? { notas: nota } : {}),
        })
        .eq('id', reserva_id)

      if (updateError) {
        console.error('Error marcando no presentado:', updateError)
        return respuesta(500, 'Error al marcar como no presentado')
      }

      // Incrementar contador del usuario dueño
      const { data: dueno } = await supabase
        .from('usuarios')
        .select('no_presentado_count_30d')
        .eq('id', reserva.usuario_id)
        .single()

      const nuevoContador = (dueno?.no_presentado_count_30d || 0) + 1

      const updateUsuario: Record<string, unknown> = {
        no_presentado_count_30d: nuevoContador,
      }

      // Aplicar bloqueo si alcanza umbral
      if (nuevoContador >= UMBRAL_NO_PRESENTADOS) {
        const bloqueadoHasta = new Date()
        bloqueadoHasta.setDate(bloqueadoHasta.getDate() + PENALIZACION_DIAS)
        updateUsuario.bloqueado_hasta = bloqueadoHasta.toISOString()
      }

      await supabase
        .from('usuarios')
        .update(updateUsuario)
        .eq('id', reserva.usuario_id)

      return respuesta(200, null, {
        estado: 'no_presentado',
        accion: 'no_presentado',
        contador: nuevoContador,
        bloqueado: nuevoContador >= UMBRAL_NO_PRESENTADOS,
      })
    }

    return respuesta(400, 'Resultado no reconocido')
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
