-- 012_pagos_club_social.sql
-- Añadir estado 'pagado' y columna datos_pago para el flujo de pagos del Club Social.

-- 1. Ampliar CHECK de estado para incluir 'pagado'
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_estado_check
  CHECK (estado IN ('confirmada', 'pendiente_pago', 'pagado', 'cancelada', 'completada', 'no_presentado', 'pendiente_no_presentado'));

-- 2. Columna datos_pago (jsonb): almacena cantidad, fianza, método, referencia, fecha, registrado_por
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS datos_pago jsonb;

-- Comentario para documentar estructura esperada de datos_pago:
-- {
--   "cantidad_euros": 50,
--   "fianza_euros": 100,
--   "metodo": "efectivo" | "bizum" | "transferencia",
--   "referencia": "string opcional",
--   "registrado_por": "uuid del admin",
--   "registrado_en": "ISO timestamp"
-- }
