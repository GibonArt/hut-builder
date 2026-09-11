-- Sdílené Auth (NHL26) + data DB (NHL27): drop FK na auth.users.
-- NHL27 auth.users je prázdné → INSERT karty padá: violates foreign key …
--
-- Preferuj: ./scripts/nas/04-fix-nhl27-auth-fks.sh
-- Nebo ručně:
--   cd /volume1/docker/supabase-nhl27
--   sudo docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     -f /volume1/docker/hut-builder/supabase/fix_cards_user_id_bez_fk_auth.sql
-- (pokud -f nevidí host path, použij skript 04 — kopíruje SQL do kontejneru)

\echo '=== FK před opravou ==='
select
  t.relname as tabulka,
  c.conname as constraint,
  pg_get_constraintdef(c.oid) as definice
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
join pg_class ft on ft.oid = c.confrelid
join pg_namespace fn on fn.oid = ft.relnamespace
where n.nspname = 'public'
  and t.relname in ('cards', 'bonus_kombinace_nastaveni', 'bonus_kombinace_global')
  and c.contype = 'f'
  and fn.nspname = 'auth'
  and ft.relname = 'users'
order by 1, 2;

do $$
declare
  r record;
begin
  for r in
    select n.nspname as schemaname, t.relname as tablename, c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_class ft on ft.oid = c.confrelid
    join pg_namespace fn on fn.oid = ft.relnamespace
    where n.nspname = 'public'
      and t.relname in ('cards', 'bonus_kombinace_nastaveni', 'bonus_kombinace_global')
      and c.contype = 'f'
      and fn.nspname = 'auth'
      and ft.relname = 'users'
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      r.schemaname,
      r.tablename,
      r.conname
    );
    raise notice 'Dropped %.%.%', r.schemaname, r.tablename, r.conname;
  end loop;
end $$;

-- Fallback starých názvů
alter table public.cards
  drop constraint if exists cards_user_id_fkey;
alter table public.bonus_kombinace_nastaveni
  drop constraint if exists bonus_kombinace_nastaveni_user_id_fkey;
alter table public.bonus_kombinace_global
  drop constraint if exists bonus_kombinace_global_updated_by_fkey;

\echo '=== FK po opravě (musí být 0 řádků) ==='
select
  t.relname as tabulka,
  c.conname as constraint,
  pg_get_constraintdef(c.oid) as definice
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
join pg_class ft on ft.oid = c.confrelid
join pg_namespace fn on fn.oid = ft.relnamespace
where n.nspname = 'public'
  and t.relname in ('cards', 'bonus_kombinace_nastaveni', 'bonus_kombinace_global')
  and c.contype = 'f'
  and fn.nspname = 'auth'
  and ft.relname = 'users'
order by 1, 2;

do $$
declare
  left_over text;
begin
  select string_agg(t.relname || '.' || c.conname, ', ')
    into left_over
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  join pg_class ft on ft.oid = c.confrelid
  join pg_namespace fn on fn.oid = ft.relnamespace
  where n.nspname = 'public'
    and t.relname in ('cards', 'bonus_kombinace_nastaveni', 'bonus_kombinace_global')
    and c.contype = 'f'
    and fn.nspname = 'auth'
    and ft.relname = 'users';

  if left_over is not null then
    raise exception 'Stále zbývají FK na auth.users: %', left_over;
  end if;

  raise notice 'OK — žádné FK na auth.users u cards / bonus tabulek.';
end $$;

notify pgrst, 'reload schema';
