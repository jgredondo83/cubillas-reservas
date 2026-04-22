-- 024_anonimizacion_rgpd_fk.sql
--
-- Permitir NULL en todas las columnas FK hacia usuarios que tienen ON DELETE SET NULL.
--
-- MOTIVO (RGPD): al eliminar un usuario, el DELETE en auth.users (y en tabla usuarios)
-- dispara SET NULL en las FKs definidas en migración 013. Si las columnas tienen NOT NULL,
-- PostgreSQL lanza error 23502 (not_null_violation) y el DELETE falla.
-- Las columnas deben poder ser NULL para conservar los registros históricos anonimizados.
--
-- NOTA: DROP NOT NULL sobre una columna ya nullable es un no-op seguro en PostgreSQL.
-- Se aplica defensivamente a todas las columnas con SET NULL FK para cubrir las que
-- se definieron con NOT NULL en el schema inicial (migración 001, creada en el dashboard).

-- ── reservas ──────────────────────────────────────────────────────────────────
-- usuario_id: FK cambiada a SET NULL en mig 015 pero columna seguía siendo NOT NULL.
-- Al borrar un usuario, el DELETE falla con 23502 al intentar anonimizar esta columna.
ALTER TABLE reservas ALTER COLUMN usuario_id DROP NOT NULL;

-- creado_por: estaba NOT NULL en el schema original → causa del error 23502.
ALTER TABLE reservas ALTER COLUMN creado_por DROP NOT NULL;

-- cancelado_por, marcado_presentado_por: añadidas en mig 007/008 sin NOT NULL,
-- pero se incluyen por completitud y para que quede documentado.
ALTER TABLE reservas ALTER COLUMN cancelado_por DROP NOT NULL;
ALTER TABLE reservas ALTER COLUMN marcado_presentado_por DROP NOT NULL;

-- ── logs_admin ────────────────────────────────────────────────────────────────
-- admin_id: FK SET NULL en mig 013. Puede tener NOT NULL del schema original.
ALTER TABLE logs_admin ALTER COLUMN admin_id DROP NOT NULL;
-- target_id: no tiene FK definida (es un uuid libre), pero puede necesitar ser NULL
-- cuando el target es el sistema o ha sido eliminado.
ALTER TABLE logs_admin ALTER COLUMN target_id DROP NOT NULL;

-- ── bloqueos ──────────────────────────────────────────────────────────────────
-- creado_por: FK SET NULL en mig 013. Puede tener NOT NULL del schema original.
ALTER TABLE bloqueos ALTER COLUMN creado_por DROP NOT NULL;

-- ── avisos ────────────────────────────────────────────────────────────────────
-- creado_por: FK SET NULL en mig 013. Puede tener NOT NULL del schema original.
ALTER TABLE avisos ALTER COLUMN creado_por DROP NOT NULL;

-- ── textos_admin ──────────────────────────────────────────────────────────────
-- updated_by: FK SET NULL en mig 013. Puede tener NOT NULL del schema original.
ALTER TABLE textos_admin ALTER COLUMN updated_by DROP NOT NULL;

-- ── Verificación completa (ejecutar tras aplicar la migración) ───────────────
-- Muestra todas las FKs hacia usuarios con su delete_rule y la nullable de la columna.
-- Todas las filas con delete_rule='SET NULL' deben tener is_nullable='YES'.
--
-- SELECT
--   tc.table_name,
--   kcu.column_name,
--   rc.delete_rule,
--   c.is_nullable
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.referential_constraints rc
--   ON tc.constraint_name = rc.constraint_name
-- JOIN information_schema.columns c
--   ON c.table_schema = tc.table_schema
--   AND c.table_name = tc.table_name
--   AND c.column_name = kcu.column_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
--   AND rc.unique_constraint_name IN (
--     SELECT constraint_name FROM information_schema.table_constraints
--     WHERE table_name = 'usuarios' AND constraint_type = 'PRIMARY KEY'
--   )
-- ORDER BY tc.table_name, kcu.column_name;
--
-- Resultado esperado para las columnas de esta migración:
--   reservas | usuario_id              | SET NULL | YES
--   reservas | creado_por              | SET NULL | YES
--   reservas | cancelado_por           | SET NULL | YES
--   reservas | marcado_presentado_por  | SET NULL | YES
--   logs_admin | admin_id              | SET NULL | YES
--   bloqueos | creado_por              | SET NULL | YES
--   avisos   | creado_por              | SET NULL | YES
--   textos_admin | updated_by          | SET NULL | YES
