-- 007_columnas_cancelacion_reservas.sql
--
-- Añade columnas necesarias para la cancelación de reservas.
-- La Edge Function cancelar-reserva las usa en el UPDATE.

ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cancelado_en timestamptz;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cancelado_por uuid REFERENCES auth.users(id);
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS motivo_cancelacion text;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cancelo_tarde boolean DEFAULT false;
