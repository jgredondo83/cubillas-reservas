-- 008_telefono_obligatorio_y_estado_previo.sql

-- Teléfono obligatorio en usuarios
ALTER TABLE usuarios ALTER COLUMN telefono SET NOT NULL;

-- Estado previo en reservas (para poder deshacer marcas del guarda)
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS estado_previo text;

-- Columnas para tracking de marcado de asistencia
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS marcado_presentado_por uuid REFERENCES auth.users(id);
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS marcado_en timestamptz;

-- Añadir estados nuevos al check de reservas.estado
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_estado_check
  CHECK (estado IN (
    'confirmada',
    'pendiente_pago',
    'cancelada',
    'no_presentado',
    'completada',
    'pendiente_no_presentado'
  ));
