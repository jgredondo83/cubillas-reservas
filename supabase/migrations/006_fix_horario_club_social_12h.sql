-- 006_fix_horario_club_social_12h.sql
--
-- Corrige la ventana horaria del Club Social 12 horas.
-- Antes: [{"desde":"12:00","hasta":"12:00"}] (rango vacío, bug).
-- Después: [{"desde":"12:00","hasta":"00:00"}] donde "00:00" = medianoche (fin del día).

UPDATE recursos
SET config = jsonb_set(config, '{horario,default}', '[{"desde":"12:00","hasta":"00:00"}]'::jsonb)
WHERE nombre = 'Club Social 12 horas';
