-- 022_estado_previo_bloqueo_usuarios.sql
-- Añade columna para guardar el estado anterior al bloqueo automático por no presentados.
-- Permite restaurar el estado correcto ('activo' o 'pendiente') al desbloquear.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS estado_previo_bloqueo text;
