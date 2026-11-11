-- ==============================================================================
-- OpenMUN - Guía de Verificación y Configuración de Row Level Security (RLS)
-- ==============================================================================
-- Este script define y verifica las políticas de seguridad a nivel de fila (RLS)
-- para la base de datos de Supabase en OpenMUN.
--
-- Tablas afectadas:
--   1. public.conferences (almacena cuentas de conferencias creadas vía Supabase Auth)
--   2. public.committees (almacena los comités sincronizados en la nube)
--
-- Modelo de seguridad:
--   - Un usuario autenticado en Supabase Auth posee un UUID (auth.uid()).
--   - En 'conferences', el campo 'id' coincide con auth.uid().
--   - En 'committees', el campo 'conference_id' coincide con auth.uid().
--   - Los usuarios anónimos NO tienen permiso de lectura, inserción, actualización ni borrado.
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE IF EXISTS public.conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.committees ENABLE ROW LEVEL SECURITY;

-- Forzar RLS incluso para los propietarios de las tablas si no son superusuarios
ALTER TABLE IF EXISTS public.conferences FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.committees FORCE ROW LEVEL SECURITY;


-- 2. POLÍTICAS PARA LA TABLA 'conferences'
-- ------------------------------------------------------------------------------
-- Eliminar políticas previas para evitar colisiones o nombres duplicados
DROP POLICY IF EXISTS "Conferences: select own" ON public.conferences;
DROP POLICY IF EXISTS "Conferences: insert own" ON public.conferences;
DROP POLICY IF EXISTS "Conferences: update own" ON public.conferences;
DROP POLICY IF EXISTS "Conferences: delete own" ON public.conferences;

-- Lectura: Solo el usuario autenticado puede leer su propia conferencia
CREATE POLICY "Conferences: select own" ON public.conferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Inserción: Solo el usuario autenticado puede insertar una fila con su propio UUID
CREATE POLICY "Conferences: insert own" ON public.conferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Actualización: Solo el usuario autenticado puede modificar su propia conferencia
CREATE POLICY "Conferences: update own" ON public.conferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Eliminación: Solo el usuario autenticado puede eliminar su propia conferencia
CREATE POLICY "Conferences: delete own" ON public.conferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);


-- 3. POLÍTICAS PARA LA TABLA 'committees'
-- ------------------------------------------------------------------------------
-- Eliminar políticas previas
DROP POLICY IF EXISTS "Committees: select own" ON public.committees;
DROP POLICY IF EXISTS "Committees: insert own" ON public.committees;
DROP POLICY IF EXISTS "Committees: update own" ON public.committees;
DROP POLICY IF EXISTS "Committees: delete own" ON public.committees;

-- Lectura: Solo el usuario autenticado cuya conferencia coincide puede leer sus comités
CREATE POLICY "Committees: select own" ON public.committees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = conference_id);

-- Inserción / Upsert: Solo puede insertar comités asociados a su propio conference_id
CREATE POLICY "Committees: insert own" ON public.committees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = conference_id);

-- Actualización: Solo puede modificar comités de su propia conferencia
CREATE POLICY "Committees: update own" ON public.committees
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = conference_id)
  WITH CHECK (auth.uid() = conference_id);

-- Eliminación: Solo puede eliminar comités de su propia conferencia
CREATE POLICY "Committees: delete own" ON public.committees
  FOR DELETE
  TO authenticated
  USING (auth.uid() = conference_id);


-- 4. CONSULTA DE AUDITORÍA Y VERIFICACIÓN
-- ------------------------------------------------------------------------------
-- Ejecuta esta consulta en el Editor SQL de Supabase para confirmar el estado de RLS:
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('conferences', 'committees');

-- Listar todas las políticas activas:
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('conferences', 'committees');
