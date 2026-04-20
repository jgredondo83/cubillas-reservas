-- 013_fks_usuarios_cascada.sql
-- Ajustar FK hacia usuarios para permitir eliminación de usuarios.
-- SET NULL para metadatos históricos, CASCADE para datos personales.

ALTER TABLE avisos
  DROP CONSTRAINT IF EXISTS avisos_creado_por_fkey,
  ADD CONSTRAINT avisos_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE bloqueos
  DROP CONSTRAINT IF EXISTS bloqueos_creado_por_fkey,
  ADD CONSTRAINT bloqueos_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE logs_admin
  DROP CONSTRAINT IF EXISTS logs_admin_admin_id_fkey,
  ADD CONSTRAINT logs_admin_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_creado_por_fkey,
  ADD CONSTRAINT reservas_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_cancelado_por_fkey,
  ADD CONSTRAINT reservas_cancelado_por_fkey
    FOREIGN KEY (cancelado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_marcado_presentado_por_fkey,
  ADD CONSTRAINT reservas_marcado_presentado_por_fkey
    FOREIGN KEY (marcado_presentado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE textos_admin
  DROP CONSTRAINT IF EXISTS textos_admin_updated_by_fkey,
  ADD CONSTRAINT textos_admin_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE reserva_participantes
  DROP CONSTRAINT IF EXISTS reserva_participantes_usuario_id_fkey,
  ADD CONSTRAINT reserva_participantes_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE solicitudes_partido_abierto
  DROP CONSTRAINT IF EXISTS solicitudes_partido_abierto_usuario_id_fkey,
  ADD CONSTRAINT solicitudes_partido_abierto_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_usuario_id_fkey,
  ADD CONSTRAINT reservas_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
