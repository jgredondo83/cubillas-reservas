-- 010_rls_admin.sql
-- RLS policies para panel admin.
-- Corregido: filtro comunidad_id, search_path fijo, policy INSERT reservas.

-- ============================================================
-- FUNCIONES HELPER
-- ============================================================

-- Devuelve la comunidad_id del usuario autenticado
CREATE OR REPLACE FUNCTION mi_comunidad()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT comunidad_id FROM usuarios WHERE id = auth.uid()
$$;

-- Devuelve el rol del usuario autenticado
CREATE OR REPLACE FUNCTION mi_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol::text FROM usuarios WHERE id = auth.uid()
$$;

-- ¿Es admin o super_admin?
CREATE OR REPLACE FUNCTION es_admin_o_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'super_admin')
  )
$$;

-- ¿Es super_admin?
CREATE OR REPLACE FUNCTION es_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol = 'super_admin'
  )
$$;

-- ============================================================
-- USUARIOS
-- ============================================================

-- Admin/super_admin pueden ver todos los usuarios de su comunidad
DROP POLICY IF EXISTS usuarios_select_admin ON usuarios;
CREATE POLICY usuarios_select_admin ON usuarios
  FOR SELECT TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- Admin/super_admin pueden insertar usuarios en su comunidad
DROP POLICY IF EXISTS usuarios_insert_admin ON usuarios;
CREATE POLICY usuarios_insert_admin ON usuarios
  FOR INSERT TO authenticated
  WITH CHECK (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- Admin/super_admin pueden actualizar usuarios de su comunidad
DROP POLICY IF EXISTS usuarios_update_admin ON usuarios;
CREATE POLICY usuarios_update_admin ON usuarios
  FOR UPDATE TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- Solo super_admin puede eliminar usuarios (no a otros super_admin) de su comunidad
DROP POLICY IF EXISTS usuarios_delete_super ON usuarios;
CREATE POLICY usuarios_delete_super ON usuarios
  FOR DELETE TO authenticated
  USING (es_super_admin() AND comunidad_id = mi_comunidad() AND rol != 'super_admin');

-- ============================================================
-- VIVIENDAS
-- ============================================================

-- Admin/super_admin pueden modificar viviendas de su comunidad
DROP POLICY IF EXISTS viviendas_update_admin ON viviendas;
CREATE POLICY viviendas_update_admin ON viviendas
  FOR UPDATE TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- Admin/super_admin pueden insertar viviendas en su comunidad
DROP POLICY IF EXISTS viviendas_insert_admin ON viviendas;
CREATE POLICY viviendas_insert_admin ON viviendas
  FOR INSERT TO authenticated
  WITH CHECK (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- ============================================================
-- RESERVAS
-- ============================================================

-- Admin/super_admin pueden ver todas las reservas de su comunidad
DROP POLICY IF EXISTS reservas_select_admin ON reservas;
CREATE POLICY reservas_select_admin ON reservas
  FOR SELECT TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- Admin/super_admin pueden actualizar cualquier reserva de su comunidad
DROP POLICY IF EXISTS reservas_update_admin ON reservas;
CREATE POLICY reservas_update_admin ON reservas
  FOR UPDATE TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- Admin/super_admin pueden insertar reservas en su comunidad
DROP POLICY IF EXISTS reservas_insert_admin ON reservas;
CREATE POLICY reservas_insert_admin ON reservas
  FOR INSERT TO authenticated
  WITH CHECK (es_admin_o_super() AND comunidad_id = mi_comunidad());

-- ============================================================
-- TEXTOS_ADMIN
-- ============================================================

DROP POLICY IF EXISTS textos_admin_insert_admin ON textos_admin;
CREATE POLICY textos_admin_insert_admin ON textos_admin
  FOR INSERT TO authenticated
  WITH CHECK (es_admin_o_super() AND comunidad_id = mi_comunidad());

DROP POLICY IF EXISTS textos_admin_update_admin ON textos_admin;
CREATE POLICY textos_admin_update_admin ON textos_admin
  FOR UPDATE TO authenticated
  USING (es_admin_o_super() AND comunidad_id = mi_comunidad());
