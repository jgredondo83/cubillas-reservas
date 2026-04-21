-- 020_activar_cron_recordatorio.sql
-- Programar cron horario para enviar recordatorios ~1h antes de cada reserva.
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
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-recordatorio-reserva') THEN
    PERFORM cron.unschedule('cron-recordatorio-reserva');
  END IF;
END $$;

-- Programar cron cada 15 minutos
SELECT cron.schedule(
  'cron-recordatorio-reserva',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://onudupsnjvppuhlyrrmq.supabase.co/functions/v1/cron-recordatorio-reserva',
      headers := '{"Content-Type": "application/json", "x-cron-key": "CRON_SECRET_KEY_AQUI"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) AS request_id;
  $$
);
