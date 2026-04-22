-- 027_bloqueos_ampliacion.sql
-- Amplía la tabla bloqueos (existente desde mig 001 con inicio/fin timestamptz)
-- para soportar bloqueos de franjas horarias reutilizables: fecha_inicio/fin + hora_inicio/fin.
-- Los campos antiguos (inicio, fin timestamptz) se conservan para compatibilidad.

ALTER TABLE bloqueos
  ADD COLUMN IF NOT EXISTS comunidad_id   uuid REFERENCES comunidades(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fecha_inicio   date,
  ADD COLUMN IF NOT EXISTS fecha_fin      date,
  ADD COLUMN IF NOT EXISTS hora_inicio    time,
  ADD COLUMN IF NOT EXISTS hora_fin       time,
  ADD COLUMN IF NOT EXISTS activo         boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS creado_en      timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en timestamptz NOT NULL DEFAULT now();

-- Índice parcial para búsquedas rápidas de bloqueos activos
CREATE INDEX IF NOT EXISTS idx_bloqueos_activos
  ON bloqueos(comunidad_id, recurso_id, activo)
  WHERE activo = true;

-- RLS
ALTER TABLE bloqueos ENABLE ROW LEVEL SECURITY;

-- Vecinos autenticados pueden ver bloqueos activos de su comunidad
DROP POLICY IF EXISTS bloqueos_read ON bloqueos;
CREATE POLICY bloqueos_read ON bloqueos
  FOR SELECT TO authenticated
  USING (comunidad_id = mi_comunidad() AND activo = true);

-- Admin y super_admin pueden gestionar los bloqueos de su comunidad
DROP POLICY IF EXISTS bloqueos_admin_all ON bloqueos;
CREATE POLICY bloqueos_admin_all ON bloqueos
  FOR ALL TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad())
  WITH CHECK (es_admin_o_super() AND comunidad_id = mi_comunidad());

NOTIFY pgrst, 'reload schema';
