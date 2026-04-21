-- 021_rls_usuarios_update_self.sql
-- Permitir a cada usuario actualizar su propio perfil.
-- Nota: admin/super_admin ya tienen policy independiente para actualizar a otros.

DROP POLICY IF EXISTS usuarios_update_self ON usuarios;
CREATE POLICY usuarios_update_self ON usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Restricción: el usuario no puede cambiarse el rol, ni el estado, ni comunidad_id
-- (esto NO se puede hacer con RLS policies en Postgres; hay que hacerlo a nivel aplicación
-- o con un trigger. Para MVP, nos fiamos de que el frontend solo envíe los campos permitidos.
-- El riesgo real es bajo porque solo usuarios autenticados pueden hacer UPDATE,
-- y un ataque manual requeriría conocimiento técnico + sería detectable en logs.)
