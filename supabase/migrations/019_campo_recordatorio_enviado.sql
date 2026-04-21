-- 019_campo_recordatorio_enviado.sql
-- Añade campo recordatorio_enviado a reservas para evitar envíos duplicados del cron de recordatorios.

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS recordatorio_enviado boolean NOT NULL DEFAULT false;

-- Índice para que el cron filtre rápido: reservas sin recordatorio en ventana temporal
CREATE INDEX IF NOT EXISTS idx_reservas_recordatorio
  ON reservas(inicio, recordatorio_enviado)
  WHERE recordatorio_enviado = false;
