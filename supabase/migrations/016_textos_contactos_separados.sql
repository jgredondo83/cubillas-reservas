-- 016_textos_contactos_separados.sql
-- Separar el texto único de contacto en dos claves:
--   contacto_general      → vigilantes, para emails operativos (confirmación, recordatorio, cancelación)
--   contacto_administracion → gestión, para mensajes de error (bloqueos, impagos)

-- 1. Insertar contacto_general (vigilantes)
INSERT INTO textos_admin (comunidad_id, clave, titulo, contenido)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'contacto_general',
  'Datos de contacto operativo (vigilantes)',
  'Email: comunidadcubillas@gmail.com. Teléfono vigilantes: 958 499 008 / 684 751 924.'
)
ON CONFLICT (comunidad_id, clave) DO UPDATE
  SET contenido = EXCLUDED.contenido,
      titulo    = EXCLUDED.titulo;

-- 2. Actualizar el texto de administración (solo email, sin teléfono de vigilantes)
UPDATE textos_admin
SET contenido = 'Email: comunidadcubillas@gmail.com',
    titulo    = 'Datos de contacto de administración'
WHERE clave = 'datos_contacto_administracion';

-- 3. Renombrar la clave a una forma más clara
UPDATE textos_admin
SET clave = 'contacto_administracion'
WHERE clave = 'datos_contacto_administracion';
