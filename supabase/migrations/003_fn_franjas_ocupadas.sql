-- 003_fn_franjas_ocupadas.sql
--
-- Función SECURITY DEFINER que devuelve franjas ocupadas sin exponer
-- datos sensibles (usuario_id, vivienda_id, etc.).
-- El frontend la llama vía supabase.rpc('franjas_ocupadas', {...}).
--
-- NOTA: Usa timestamptz (inicio/fin) tras la migración 004.

CREATE OR REPLACE FUNCTION public.franjas_ocupadas(
  p_recurso_ids uuid[],
  p_fecha_desde date,
  p_fecha_hasta date
) RETURNS TABLE(
  recurso_id uuid,
  inicio timestamptz,
  fin timestamptz,
  estado text
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  -- CAMBIO: devuelve cualquier reserva que SOLAPE con el rango pedido,
  -- no solo las que empiezan dentro. Crítico para reservas que cruzan
  -- medianoche (ej. club social 22:00-04:00 debe aparecer al consultar
  -- el día siguiente).
  --
  -- CAMBIO: interpretamos las fechas como días en Europe/Madrid para
  -- evitar desfases por la timezone UTC del servidor Supabase.
  SELECT r.recurso_id, r.inicio, r.fin, r.estado::text
  FROM reservas r
  WHERE r.estado IN ('confirmada', 'pendiente_pago')
    AND r.recurso_id = ANY(p_recurso_ids)
    AND r.inicio < ((p_fecha_hasta + interval '1 day')::timestamp AT TIME ZONE 'Europe/Madrid')
    AND r.fin > (p_fecha_desde::timestamp AT TIME ZONE 'Europe/Madrid');
$$;

GRANT EXECUTE ON FUNCTION public.franjas_ocupadas(uuid[], date, date) TO authenticated;