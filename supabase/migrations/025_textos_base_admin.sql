-- 025_textos_base_admin.sql
-- Seed de textos base editables por admin desde la UI.

INSERT INTO textos_admin (comunidad_id, clave, titulo, contenido)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'mensaje_bienvenida',
    'Mensaje de bienvenida en dashboard',
    'Bienvenido/a a las reservas de Parque del Cubillas. Desde aquí puedes reservar las pistas de pádel y tenis de la urbanización. Consulta las <a href="/normas-uso">normas de uso</a> antes de reservar.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'normas_uso',
    'Normas de uso de los recursos',
    'Sé respetuoso con los demás. Respeta los horarios. Limpia las pistas tras usarlas. No dejes basura. Los menores deben estar acompañados por un adulto.'
  )
ON CONFLICT (comunidad_id, clave) DO NOTHING;
