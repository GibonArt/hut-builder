-- Oprava GRANT + RLS pro HUT tabulky na self-hosted Supabase (po migraci z cloudu).
-- Spusť na NAS:
--   cd /volume1/docker/supabase-project
--   docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < /volume1/docker/hut-builder/supabase/fix_selfhosted_hut_grants.sql

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- --- hut_typy_karet_dynamic ---
ALTER TABLE public.hut_typy_karet_dynamic ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hut_typy_karet_dynamic TO authenticated, service_role;

DROP POLICY IF EXISTS "hut_typy_dynamic_select_auth" ON public.hut_typy_karet_dynamic;
CREATE POLICY "hut_typy_dynamic_select_auth"
  ON public.hut_typy_karet_dynamic FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hut_typy_dynamic_insert_editor" ON public.hut_typy_karet_dynamic;
CREATE POLICY "hut_typy_dynamic_insert_editor"
  ON public.hut_typy_karet_dynamic FOR INSERT TO authenticated
  WITH CHECK (public.je_bonus_kombinace_editor());

DROP POLICY IF EXISTS "hut_typy_dynamic_update_editor" ON public.hut_typy_karet_dynamic;
CREATE POLICY "hut_typy_dynamic_update_editor"
  ON public.hut_typy_karet_dynamic FOR UPDATE TO authenticated
  USING (public.je_bonus_kombinace_editor())
  WITH CHECK (public.je_bonus_kombinace_editor());

DROP POLICY IF EXISTS "hut_typy_dynamic_delete_editor" ON public.hut_typy_karet_dynamic;
CREATE POLICY "hut_typy_dynamic_delete_editor"
  ON public.hut_typy_karet_dynamic FOR DELETE TO authenticated
  USING (public.je_bonus_kombinace_editor());

GRANT EXECUTE ON FUNCTION public.list_hut_typy_karet_dynamic() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_hut_typy_karet_dynamic(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.je_bonus_kombinace_editor() TO authenticated, service_role;

-- --- bonus_kombinace_global (admin tlačítka) ---
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonus_kombinace_global TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
