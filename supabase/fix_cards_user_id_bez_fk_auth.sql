-- Sdílené Auth (NHL26) + data DB (NHL27): drop FK na auth.users.
-- NHL27 auth.users je prázdné → INSERT karty: cards_user_id_fkey
--
-- Preferuj: ./scripts/nas/04-fix-nhl27-auth-fks.sh

\echo '=== Připojení ==='
select current_database() as db, inet_server_addr() as addr, current_setting('port') as port;

\echo '=== VŠECHNY FK na public.cards (bez filtru) ==='
select c.conname, pg_get_constraintdef(c.oid) as definice
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'cards'
  and c.contype = 'f'
order by 1;

do $$
declare
  r record;
begin
  -- Drop podle cíle auth.users
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
    raise notice 'Dropped %.%.% (auth.users)', r.schemaname, r.tablename, r.conname;
  end loop;

  -- Drop podle přesného jména z chybové hlášky appky
  for r in
    select n.nspname as schemaname, t.relname as tablename, c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'cards'
      and c.contype = 'f'
      and c.conname in ('cards_user_id_fkey')
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      r.schemaname,
      r.tablename,
      r.conname
    );
    raise notice 'Dropped %.%.% (by name)', r.schemaname, r.tablename, r.conname;
  end loop;
end $$;

alter table public.cards drop constraint if exists cards_user_id_fkey;
alter table public.bonus_kombinace_nastaveni
  drop constraint if exists bonus_kombinace_nastaveni_user_id_fkey;
alter table public.bonus_kombinace_global
  drop constraint if exists bonus_kombinace_global_updated_by_fkey;

\echo '=== FK na cards po opravě (musí být 0 řádků) ==='
select c.conname, pg_get_constraintdef(c.oid) as definice
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'cards'
  and c.contype = 'f'
order by 1;

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'cards'
      and c.conname = 'cards_user_id_fkey'
  ) then
    raise exception 'cards_user_id_fkey stále existuje po DROP';
  end if;
  raise notice 'OK — cards_user_id_fkey neexistuje.';
end $$;

notify pgrst, 'reload schema';
