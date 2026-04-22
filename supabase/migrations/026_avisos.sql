-- 026_avisos.sql
-- Tabla avisos: reescribe la versión anterior (schema incorrecto).
-- DROP + CREATE para garantizar schema limpio.
-- OK perder datos: tabla existente solo tenía registros de test.

DROP TABLE IF EXISTS avisos CASCADE;

CREATE TABLE avisos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comunidad_id   uuid NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('info','advertencia','urgente')),
  titulo         text NOT NULL,
  contenido      text NOT NULL,
  fecha_inicio   timestamptz,
  fecha_fin      timestamptz,
  activo         boolean NOT NULL DEFAULT true,
  creado_por     uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_avisos_activo ON avisos(comunidad_id, activo) WHERE activo = true;

ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;

-- Vecinos autenticados pueden leer avisos activos de su comunidad
DROP POLICY IF EXISTS avisos_read ON avisos;
CREATE POLICY avisos_read ON avisos
  FOR SELECT TO authenticated
  USING (comunidad_id = mi_comunidad() AND activo = true);

-- Admin y super_admin pueden gestionar todos los avisos de su comunidad
DROP POLICY IF EXISTS avisos_admin_all ON avisos;
CREATE POLICY avisos_admin_all ON avisos
  FOR ALL TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad())
  WITH CHECK (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- Notificar a PostgREST para que recargue el schema
NOTIFY pgrst, 'reload schema';
