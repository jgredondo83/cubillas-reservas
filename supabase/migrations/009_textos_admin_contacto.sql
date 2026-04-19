-- 009_textos_admin_contacto.sql
-- Seed de datos de contacto de administración para mensajes de error.

INSERT INTO textos_admin (comunidad_id, clave, contenido)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'datos_contacto_administracion',
  'Horario: lunes a viernes 10:00-14:00. Teléfono: 958 499 008. Email: comunidadcubillas@gmail.com.'
)
ON CONFLICT (comunidad_id, clave) DO NOTHING;
