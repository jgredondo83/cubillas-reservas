-- 028_bloqueos_limpieza_columnas_viejas.sql
-- Eliminar columnas viejas inicio/fin de bloqueos (eran para bloqueos puntuales de 1 hora).
-- Ahora usamos fecha_inicio + fecha_fin + hora_inicio + hora_fin para franjas recurrentes.
-- PRECONDICIÓN: ejecutar solo si SELECT count(*) FROM bloqueos = 0.

ALTER TABLE bloqueos DROP COLUMN inicio;
ALTER TABLE bloqueos DROP COLUMN fin;
ALTER TABLE bloqueos ALTER COLUMN recurso_id SET NOT NULL;
ALTER TABLE bloqueos ALTER COLUMN fecha_inicio SET NOT NULL;
ALTER TABLE bloqueos ALTER COLUMN hora_inicio SET NOT NULL;
ALTER TABLE bloqueos ALTER COLUMN hora_fin SET NOT NULL;

NOTIFY pgrst, 'reload schema';
