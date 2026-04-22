// gestionar-bloqueo-franja/index.ts
// Gestiona bloqueos de franjas horarias para un recurso.
// Desplegada con --no-verify-jwt + verificación manual.
//
// Acciones:
//   verificar_conflictos — detecta reservas activas en la franja
//   crear               — inserta el bloqueo (rechaza si hay conflictos)
//   desactivar          — marca activo=false
//   eliminar            — borra el registro

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { verificarJWT } from '../_shared/auth.ts'

const ESTADOS_EXCLUIDOS = ['cancelada', 'completada', 'no_presentado']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // 1. Verificar JWT
    const auth = await verificarJWT(req, supabase)
    if (auth.error) {
      return respuesta(auth.status, auth.error)
    }
    const { user } = auth

    // 2. Cargar perfil y verificar rol admin
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, comunidad_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!perfil || !['admin', 'super_admin'].includes(perfil.rol)) {
      return respuesta(403, 'Acceso denegado: se requiere rol admin o super_admin')
    }

    const comunidadId = perfil.comunidad_id

    // 3. Parsear body
    const body = await req.json()
    const { accion, bloqueo } = body as {
      accion: 'verificar_conflictos' | 'crear' | 'desactivar' | 'eliminar'
      bloqueo: Record<string, unknown>
    }

    if (!accion) {
      return respuesta(400, 'Campo accion requerido')
    }

    // ─── verificar_conflictos ────────────────────────────────────────────────
    if (accion === 'verificar_conflictos') {
      const { recurso_id, fecha_inicio, fecha_fin, hora_inicio, hora_fin } = bloqueo as {
        recurso_id: string
        fecha_inicio: string
        fecha_fin: string | null
        hora_inicio: string
        hora_fin: string
      }

      if (!recurso_id || !fecha_inicio || !hora_inicio || !hora_fin) {
        return respuesta(400, 'Faltan campos: recurso_id, fecha_inicio, hora_inicio, hora_fin')
      }

      const conflictos = await buscarConflictos(supabase, {
        recurso_id,
        fecha_inicio,
        fecha_fin: fecha_fin ?? null,
        hora_inicio,
        hora_fin,
        comunidad_id: comunidadId,
      })

      return new Response(JSON.stringify({
        tiene_conflictos: conflictos.length > 0,
        reservas: conflictos,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ─── crear ───────────────────────────────────────────────────────────────
    if (accion === 'crear') {
      const { recurso_id, fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo } = bloqueo as {
        recurso_id: string
        fecha_inicio: string
        fecha_fin: string | null
        hora_inicio: string
        hora_fin: string
        motivo: string
      }

      if (!recurso_id || !fecha_inicio || !hora_inicio || !hora_fin || !motivo) {
        return respuesta(400, 'Faltan campos obligatorios')
      }

      // Verificar que el recurso pertenece a la comunidad
      const { data: recurso } = await supabase
        .from('recursos')
        .select('id, nombre')
        .eq('id', recurso_id)
        .eq('comunidad_id', comunidadId)
        .maybeSingle()

      if (!recurso) {
        return respuesta(404, 'Recurso no encontrado en esta comunidad')
      }

      // Re-verificar conflictos antes de insertar
      const conflictos = await buscarConflictos(supabase, {
        recurso_id,
        fecha_inicio,
        fecha_fin: fecha_fin ?? null,
        hora_inicio,
        hora_fin,
        comunidad_id: comunidadId,
      })

      if (conflictos.length > 0) {
        return new Response(JSON.stringify({
          error: `Hay ${conflictos.length} reserva(s) activa(s) en esta franja. Cancélalas antes de aplicar el bloqueo.`,
          reservas: conflictos,
        }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Insertar bloqueo
      const { data: nuevo, error: insertError } = await supabase
        .from('bloqueos')
        .insert({
          comunidad_id: comunidadId,
          recurso_id,
          fecha_inicio,
          fecha_fin: fecha_fin || null,
          hora_inicio,
          hora_fin,
          motivo,
          activo: true,
          creado_por: user.id,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error insertando bloqueo:', insertError)
        return respuesta(500, 'Error al crear el bloqueo')
      }

      // Log
      await supabase.from('logs_admin').insert({
        comunidad_id: comunidadId,
        admin_id: user.id,
        accion: 'bloqueo_franja_creado',
        tabla_afectada: 'bloqueos',
        registro_id: nuevo.id,
        detalle: {
          recurso_id,
          recurso_nombre: recurso.nombre,
          fecha_inicio,
          fecha_fin: fecha_fin || null,
          hora_inicio,
          hora_fin,
          motivo,
        },
      })

      return new Response(JSON.stringify({ id: nuevo.id }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── desactivar ──────────────────────────────────────────────────────────
    if (accion === 'desactivar') {
      const { id } = bloqueo as { id: string }
      if (!id) return respuesta(400, 'Campo id requerido')

      // Verificar pertenencia
      const { data: existente } = await supabase
        .from('bloqueos')
        .select('id, motivo, recurso_id')
        .eq('id', id)
        .eq('comunidad_id', comunidadId)
        .maybeSingle()

      if (!existente) return respuesta(404, 'Bloqueo no encontrado')

      const { error } = await supabase
        .from('bloqueos')
        .update({ activo: false, actualizado_en: new Date().toISOString() })
        .eq('id', id)

      if (error) return respuesta(500, 'Error al desactivar el bloqueo')

      await supabase.from('logs_admin').insert({
        comunidad_id: comunidadId,
        admin_id: user.id,
        accion: 'bloqueo_franja_desactivado',
        tabla_afectada: 'bloqueos',
        registro_id: id,
        detalle: { motivo: existente.motivo, recurso_id: existente.recurso_id },
      })

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── eliminar ────────────────────────────────────────────────────────────
    if (accion === 'eliminar') {
      const { id } = bloqueo as { id: string }
      if (!id) return respuesta(400, 'Campo id requerido')

      const { data: existente } = await supabase
        .from('bloqueos')
        .select('id, motivo, recurso_id')
        .eq('id', id)
        .eq('comunidad_id', comunidadId)
        .maybeSingle()

      if (!existente) return respuesta(404, 'Bloqueo no encontrado')

      const { error } = await supabase.from('bloqueos').delete().eq('id', id)
      if (error) return respuesta(500, 'Error al eliminar el bloqueo')

      await supabase.from('logs_admin').insert({
        comunidad_id: comunidadId,
        admin_id: user.id,
        accion: 'bloqueo_franja_eliminado',
        tabla_afectada: 'bloqueos',
        registro_id: id,
        detalle: { motivo: existente.motivo, recurso_id: existente.recurso_id },
      })

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return respuesta(400, `Acción desconocida: ${accion}`)
  } catch (err) {
    console.error('Error inesperado:', err)
    return respuesta(500, 'Error inesperado')
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function respuesta(status: number, mensaje: string) {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function horaAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function horaEnMadrid(ts: string): string {
  // Extrae HH:MM de un timestamp en zona Europe/Madrid
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

async function buscarConflictos(
  supabase: ReturnType<typeof createClient>,
  params: {
    recurso_id: string
    fecha_inicio: string
    fecha_fin: string | null
    hora_inicio: string
    hora_fin: string
    comunidad_id: string
  },
) {
  const { recurso_id, fecha_inicio, fecha_fin, hora_inicio, hora_fin } = params

  // Rango de fechas de la reserva
  const desdeISO = `${fecha_inicio}T00:00:00`
  const hastaISO = fecha_fin ? `${fecha_fin}T23:59:59` : '2099-12-31T23:59:59'

  const { data: reservas } = await supabase
    .from('reservas')
    .select('id, inicio, fin, usuario_id, vivienda_id, usuarios(nombre, apellidos), viviendas(referencia)')
    .eq('recurso_id', recurso_id)
    .not('estado', 'in', `(${ESTADOS_EXCLUIDOS.map((e) => `"${e}"`).join(',')})`)
    .gte('inicio', desdeISO)
    .lte('inicio', hastaISO)

  if (!reservas || reservas.length === 0) return []

  const bloqInicioMin = horaAMinutos(hora_inicio)
  const bloqFinMin = horaAMinutos(hora_fin)

  return reservas
    .filter((r) => {
      const rHoraInicio = horaEnMadrid(r.inicio)
      const rHoraFin = horaEnMadrid(r.fin)
      const rInicioMin = horaAMinutos(rHoraInicio)
      const rFinMin = horaAMinutos(rHoraFin)
      return rInicioMin < bloqFinMin && rFinMin > bloqInicioMin
    })
    .map((r) => {
      const usuario = r.usuarios as { nombre: string; apellidos: string } | null
      const vivienda = r.viviendas as { referencia: string } | null
      return {
        id: r.id,
        inicio: r.inicio,
        fin: r.fin,
        usuario_nombre: usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Sin usuario',
        vivienda_referencia: vivienda?.referencia ?? '—',
      }
    })
}
