-- 029_antelacion_club_social.sql
-- Ajusta la config de antelación según el reglamento real de la comunidad:
--   Club Social: antelación mínima 3 días, máxima 365 días (necesitan tiempo para gestión, pago, fianza, llaves).
--   Pádel/Tenis: antelación mínima 0 días (pueden reservar hoy mismo).

-- Club Social: máxima 365 días + mínima 3 días
UPDATE recursos
SET config = jsonb_set(
  jsonb_set(config, '{antelacion_dias}', '365'::jsonb),
  '{antelacion_minima_dias}', '3'::jsonb
)
WHERE nombre IN ('Club Social 2 horas', 'Club Social 6 horas', 'Club Social 12 horas');

-- Pádel y tenis: asegurar antelacion_minima_dias = 0 (si no existe el campo)
UPDATE recursos
SET config = jsonb_set(config, '{antelacion_minima_dias}', '0'::jsonb)
WHERE tipo IN ('padel', 'tenis')
  AND (config->>'antelacion_minima_dias') IS NULL;
