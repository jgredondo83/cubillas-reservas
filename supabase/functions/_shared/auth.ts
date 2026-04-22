// _shared/auth.ts
// Helper para verificación manual de JWT en Edge Functions desplegadas con --no-verify-jwt.
// MOTIVO: Supabase Edge Functions no soporta el algoritmo ES256 en la verificación automática.
// FIX: desplegar con --no-verify-jwt y verificar manualmente con supabase.auth.getUser(token).

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface VerificacionOk {
  user: { id: string; email?: string }
  error: null
}
interface VerificacionError {
  user: null
  error: string
  status: number
}

export type ResultadoVerificacion = VerificacionOk | VerificacionError

export async function verificarJWT(
  req: Request,
  supabaseAdmin: SupabaseClient,
): Promise<ResultadoVerificacion> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Token de autorización requerido', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return { user: null, error: 'Token no válido', status: 401 }
  }

  return { user, error: null }
}
