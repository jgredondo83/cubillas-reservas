-- 004_timestamptz_reservas_y_espacio_id.sql
--
-- CAMBIO 1: Modelo de reservas a timestamptz (opción B).
-- CAMBIO 2: Añade espacio_id a recursos (opción A).

-- ============================================================
-- PARTE 1: espacio_id en recursos
-- ============================================================

ALTER TABLE recursos ADD COLUMN IF NOT EXISTS espacio_id uuid;

-- CAMBIO: usar uuid_generate_v4() (ya cargado en migración 001) en lugar
-- de gen_random_uuid() para consistencia.
DO $$
DECLARE
  v_espacio_club uuid := uuid_generate_v4();
BEGIN
  UPDATE recursos SET espacio_id = v_espacio_club WHERE tipo = 'club_social' AND espacio_id IS NULL;
  UPDATE recursos SET espacio_id = id WHERE tipo IN ('padel', 'tenis') AND espacio_id IS NULL;
END $$;

ALTER TABLE recursos ALTER COLUMN espacio_id SET NOT NULL;

-- ============================================================
-- PARTE 2: Reservas con timestamptz
-- ============================================================

-- CAMBIO: defensivo. Borra todos los constraints viejos relacionados
-- con horarios de reservas que puedan estar colgando.
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_no_solape;
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_no_solapamiento;
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS horas_validas;
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS chk_hora_fin_mayor;
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS chk_fin_mayor_inicio;

-- Añadir columnas nuevas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS inicio timestamptz;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS fin timestamptz;

-- Migrar datos existentes (si los hay). La tabla debería estar vacía.
UPDATE reservas
SET inicio = ((fecha::text || ' ' || hora_inicio::text)::timestamp AT TIME ZONE 'Europe/Madrid'),
    fin = CASE
      WHEN hora_fin > hora_inicio
        THEN ((fecha::text || ' ' || hora_fin::text)::timestamp AT TIME ZONE 'Europe/Madrid')
      ELSE (((fecha + interval '1 day')::date::text || ' ' || hora_fin::text)::timestamp AT TIME ZONE 'Europe/Madrid')
    END
WHERE inicio IS NULL AND fecha IS NOT NULL;

-- Hacer NOT NULL
ALTER TABLE reservas ALTER COLUMN inicio SET NOT NULL;
ALTER TABLE reservas ALTER COLUMN fin SET NOT NULL;

-- Eliminar columnas viejas
ALTER TABLE reservas DROP COLUMN IF EXISTS fecha;
ALTER TABLE reservas DROP COLUMN IF EXISTS hora_inicio;
ALTER TABLE reservas DROP COLUMN IF EXISTS hora_fin;

-- CHECK: fin > inicio
ALTER TABLE reservas ADD CONSTRAINT chk_fin_mayor_inicio CHECK (fin > inicio);

-- Exclusion constraint sobre espacio_id
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Añadir espacio_id a reservas (denormalizado para el constraint)
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS espacio_id uuid;

UPDATE reservas r
SET espacio_id = rec.espacio_id
FROM recursos rec
WHERE r.recurso_id = rec.id
  AND r.espacio_id IS NULL;

-- Trigger para poblar espacio_id en nuevas reservas
CREATE OR REPLACE FUNCTION trg_copiar_espacio_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT espacio_id INTO NEW.espacio_id FROM recursos WHERE id = NEW.recurso_id;
  IF NEW.espacio_id IS NULL THEN
    RAISE EXCEPTION 'Recurso % no tiene espacio_id', NEW.recurso_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservas_copiar_espacio ON reservas;
CREATE TRIGGER trg_reservas_copiar_espacio
  BEFORE INSERT ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION trg_copiar_espacio_id();

ALTER TABLE reservas ALTER COLUMN espacio_id SET NOT NULL;

-- Exclusion constraint: no solapamiento dentro del mismo espacio
-- CAMBIO: defensivo por si el constraint ya existía.
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_no_solapamiento_espacio;
ALTER TABLE reservas ADD CONSTRAINT reservas_no_solapamiento_espacio
  EXCLUDE USING gist (
    espacio_id WITH =,
    tstzrange(inicio, fin) WITH &&
  )
  WHERE (estado IN ('confirmada', 'pendiente_pago'));

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_reservas_recurso_inicio
  ON reservas (recurso_id, inicio);

CREATE INDEX IF NOT EXISTS idx_reservas_usuario_estado
  ON reservas (usuario_id, estado);