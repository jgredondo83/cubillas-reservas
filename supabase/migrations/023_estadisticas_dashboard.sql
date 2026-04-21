-- 023_estadisticas_dashboard.sql
-- Función RPC para estadísticas del mes en curso del dashboard admin.
-- Devuelve un objeto jsonb con todos los indicadores en una sola llamada.

CREATE OR REPLACE FUNCTION estadisticas_dashboard_admin(com_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  resultado              jsonb;
  inicio_mes             timestamptz;
  inicio_mes_siguiente   timestamptz;
  total_reservas_mes     integer := 0;
  total_completadas      integer := 0;
  total_no_presentado    integer := 0;
  pct_asistencia         numeric;
  vecinos_count          integer := 0;
  recurso_top            jsonb;
  vecino_top             jsonb;
  ocupacion_recursos     jsonb;
BEGIN
  -- Rango del mes en curso (UTC; la función se llama desde el frontend que ya sabe qué mes es)
  inicio_mes           := date_trunc('month', now());
  inicio_mes_siguiente := inicio_mes + interval '1 month';

  -- Total reservas del mes (todas, incluyendo canceladas)
  SELECT count(*)
  INTO total_reservas_mes
  FROM reservas
  WHERE comunidad_id = com_id
    AND creado_en >= inicio_mes
    AND creado_en <  inicio_mes_siguiente;

  -- Completadas y no_presentado del mes, solo las ya finalizadas
  SELECT
    count(*) FILTER (WHERE estado = 'completada'),
    count(*) FILTER (WHERE estado = 'no_presentado')
  INTO total_completadas, total_no_presentado
  FROM reservas
  WHERE comunidad_id = com_id
    AND fin >= inicio_mes
    AND fin <  inicio_mes_siguiente
    AND fin <  now();

  -- % asistencia
  IF (total_completadas + total_no_presentado) > 0 THEN
    pct_asistencia := round(
      total_completadas::numeric * 100.0 / (total_completadas + total_no_presentado),
      1
    );
  ELSE
    pct_asistencia := NULL;
  END IF;

  -- Recurso top (excluyendo canceladas)
  SELECT jsonb_build_object('nombre', rec.nombre, 'count', top_res.cnt)
  INTO recurso_top
  FROM (
    SELECT recurso_id, count(*) AS cnt
    FROM reservas
    WHERE comunidad_id = com_id
      AND creado_en >= inicio_mes
      AND creado_en <  inicio_mes_siguiente
      AND estado != 'cancelada'
    GROUP BY recurso_id
    ORDER BY cnt DESC
    LIMIT 1
  ) top_res
  JOIN recursos rec ON rec.id = top_res.recurso_id;

  -- Nº de vecinos distintos con reservas en el mes (para privacidad)
  SELECT count(DISTINCT res.usuario_id)
  INTO vecinos_count
  FROM reservas res
  JOIN usuarios u ON u.id = res.usuario_id AND u.rol = 'vecino'
  WHERE res.comunidad_id = com_id
    AND res.creado_en >= inicio_mes
    AND res.creado_en <  inicio_mes_siguiente
    AND res.estado != 'cancelada'
    AND res.usuario_id IS NOT NULL;

  -- Vecino top (solo si hay más de 2 vecinos distintos)
  IF vecinos_count > 2 THEN
    SELECT jsonb_build_object(
      'nombre', u2.nombre || ' ' || coalesce(u2.apellidos, ''),
      'count', top_user.cnt
    )
    INTO vecino_top
    FROM (
      SELECT res.usuario_id, count(*) AS cnt
      FROM reservas res
      JOIN usuarios u1 ON u1.id = res.usuario_id AND u1.rol = 'vecino'
      WHERE res.comunidad_id = com_id
        AND res.creado_en >= inicio_mes
        AND res.creado_en <  inicio_mes_siguiente
        AND res.estado != 'cancelada'
        AND res.usuario_id IS NOT NULL
      GROUP BY res.usuario_id
      ORDER BY cnt DESC
      LIMIT 1
    ) top_user
    JOIN usuarios u2 ON u2.id = top_user.usuario_id;
  END IF;

  -- Ocupación por recurso
  SELECT jsonb_agg(fila ORDER BY (fila->>'reservas')::int DESC)
  INTO ocupacion_recursos
  FROM (
    SELECT jsonb_build_object(
      'id',              r.id,
      'nombre',          r.nombre,
      'tipo',            r.tipo,
      'reservas',        coalesce(count(res.id), 0),
      'horas_reservadas', round(
        coalesce(
          sum(extract(epoch from (res.fin - res.inicio)) / 3600.0),
          0
        )::numeric,
        1
      )
    ) AS fila
    FROM recursos r
    LEFT JOIN reservas res
      ON  res.recurso_id   = r.id
      AND res.comunidad_id = com_id
      AND res.creado_en  >= inicio_mes
      AND res.creado_en  <  inicio_mes_siguiente
      AND res.estado      != 'cancelada'
    WHERE r.comunidad_id = com_id
    GROUP BY r.id, r.nombre, r.tipo
  ) sub;

  resultado := jsonb_build_object(
    'total_reservas_mes',      total_reservas_mes,
    'total_completadas',       total_completadas,
    'total_no_presentado',     total_no_presentado,
    'pct_asistencia',          pct_asistencia,
    'recurso_top',             recurso_top,
    'vecino_top',              vecino_top,
    'vecinos_con_reservas_mes', vecinos_count,
    'ocupacion_recursos',      coalesce(ocupacion_recursos, '[]'::jsonb)
  );

  RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION estadisticas_dashboard_admin(uuid) TO authenticated;
