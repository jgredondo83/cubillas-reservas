-- 017_funcion_reservas_activas.sql
-- Función helper para contar reservas activas de un usuario.
-- Usada en el panel admin para la columna "Reservas activas" en el listado de usuarios.

CREATE OR REPLACE FUNCTION reservas_usuario(usuario_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM reservas
  WHERE usuario_id = usuario_uuid
    AND estado IN ('confirmada', 'pendiente_pago', 'pagado')
    AND fin > now()
$$;

-- Índice para acelerar esta consulta (y el filtro "solo con activas" en el panel)
CREATE INDEX IF NOT EXISTS idx_reservas_usuario_estado_fin
  ON reservas(usuario_id, estado, fin)
  WHERE estado IN ('confirmada', 'pendiente_pago', 'pagado');
