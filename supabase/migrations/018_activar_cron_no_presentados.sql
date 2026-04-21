-- 018_activar_cron_no_presentados.sql
-- Programar cron diario para marcar reservas pasadas sin asistencia como 'pendiente_no_presentado'.
--
-- REQUISITO: sustituir CRON_SECRET_KEY_AQUI por el valor real del secret CRON_SECRET_KEY
-- antes de ejecutar esta migración. Puedes verlo en:
--   Supabase Dashboard → Edge Functions → Secrets → CRON_SECRET_KEY

-- Asegurar extensiones (habitualmente ya instaladas en Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eliminar cron previo si existiera (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-marcar-no-presentados') THEN
    PERFORM cron.unschedule('cron-marcar-no-presentados');
  END IF;
END $$;

-- Programar cron diario a las 00:05 UTC (≈01:05h-02:05h España según DST)
SELECT cron.schedule(
  'cron-marcar-no-presentados',
  '5 0 * * *',
  $$
    SELECT net.http_post(
      url := 'https://onudupsnjvppuhlyrrmq.supabase.co/functions/v1/cron-marcar-no-presentados',
      headers := '{"Content-Type": "application/json", "x-cron-key": "CRON_SECRET_KEY_AQUI"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) AS request_id;
  $$
);
