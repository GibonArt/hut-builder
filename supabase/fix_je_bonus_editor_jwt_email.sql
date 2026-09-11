-- Oprava RLS editora pro sdílené Auth (NHL26) + data DB (NHL27).
-- Původní je_bonus_kombinace_editor() četla e-mail z lokálního auth.users —
-- na NHL27 uživatel neexistuje → INSERT/UPDATE bonus_kombinace_global padá na RLS.
--
-- Spusť na NHL27 (a klidně i na NHL26 — je idempotentní):
--   cd /volume1/docker/supabase-nhl27
--   sudo docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < /volume1/docker/hut-builder/supabase/fix_je_bonus_editor_jwt_email.sql

create or replace function public.je_bonus_kombinace_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'email', ''),
    (
      select u.email::text
      from auth.users u
      where u.id = auth.uid()
      limit 1
    )
  ))) in (
    'gibonart@gmail.com'
  );
$$;

comment on function public.je_bonus_kombinace_editor() is
  'true jen pro účty, které smí měnit sdílené bonus kombinace; drž v souladu s lib/bonusAdmin.ts';

grant execute on function public.je_bonus_kombinace_editor() to authenticated;
grant execute on function public.je_bonus_kombinace_editor() to service_role;

-- updated_by z Auth NHL26 nemusí být v NHL27 auth.users
alter table public.bonus_kombinace_global
  drop constraint if exists bonus_kombinace_global_updated_by_fkey;

notify pgrst, 'reload schema';
