-- 014_costes_club_social.sql
-- Configurar coste y fianza para recursos Club Social.

UPDATE recursos
SET config = jsonb_set(
  jsonb_set(config, '{coste_euros}', '40'::jsonb),
  '{fianza_euros}', '210'::jsonb
)
WHERE nombre IN ('Club Social 6 horas', 'Club Social 12 horas');

-- Club Social 2 horas no tiene coste (solo_admin=true para Ayuntamiento)
UPDATE recursos
SET config = jsonb_set(
  jsonb_set(config, '{coste_euros}', '0'::jsonb),
  '{fianza_euros}', '0'::jsonb
)
WHERE nombre = 'Club Social 2 horas';
