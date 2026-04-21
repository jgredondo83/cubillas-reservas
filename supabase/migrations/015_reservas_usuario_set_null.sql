-- 015_reservas_usuario_set_null.sql
-- Cambiar FK reservas.usuario_id de CASCADE a SET NULL.
-- Razón (RGPD): al eliminar un usuario, queremos conservar sus reservas pasadas anonimizadas
-- para análisis histórico de uso de recursos. Las reservas futuras se cancelan explícitamente
-- en la Edge Function eliminar-cuenta (implementada en bloque 3) antes de borrar el usuario,
-- para liberar franjas. Las pasadas quedan con usuario_id = NULL.

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_usuario_id_fkey,
  ADD CONSTRAINT reservas_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
