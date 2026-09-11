-- Sdílené Auth (NHL26) + data DB (NHL27): UUID z Auth nesmí FK na lokální auth.users
-- (NHL27 auth.users je prázdné → INSERT karty / bonusů padá na FK).
--
-- Spusť na NHL27 (povinné, jinak karty neuložíš):
--   cd /volume1/docker/hut-builder && git pull
--   cd /volume1/docker/supabase-nhl27
--   sudo docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < /volume1/docker/hut-builder/supabase/fix_cards_user_id_bez_fk_auth.sql

-- Drop všech FK z cards.user_id (jakýkoli název constraintu)
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'cards'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%user_id%auth.users%'
  loop
    execute format('alter table public.cards drop constraint %I', r.conname);
    raise notice 'Dropped cards FK: %', r.conname;
  end loop;

  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'bonus_kombinace_nastaveni'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%auth.users%'
  loop
    execute format(
      'alter table public.bonus_kombinace_nastaveni drop constraint %I',
      r.conname
    );
    raise notice 'Dropped bonus_kombinace_nastaveni FK: %', r.conname;
  end loop;

  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'bonus_kombinace_global'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%auth.users%'
  loop
    execute format(
      'alter table public.bonus_kombinace_global drop constraint %I',
      r.conname
    );
    raise notice 'Dropped bonus_kombinace_global FK: %', r.conname;
  end loop;
end $$;

-- Explicitní fallback (starší názvy)
alter table public.cards
  drop constraint if exists cards_user_id_fkey;
alter table public.bonus_kombinace_nastaveni
  drop constraint if exists bonus_kombinace_nastaveni_user_id_fkey;
alter table public.bonus_kombinace_global
  drop constraint if exists bonus_kombinace_global_updated_by_fkey;

-- Ověření: nesmí zůstat žádný FK na auth.users u těchto tabulek
do $$
declare
  left_over text;
begin
  select string_agg(t.relname || '.' || c.conname, ', ')
    into left_over
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname in ('cards', 'bonus_kombinace_nastaveni', 'bonus_kombinace_global')
    and c.contype = 'f'
    and pg_get_constraintdef(c.oid) ilike '%auth.users%';

  if left_over is not null then
    raise exception 'Stále zbývají FK na auth.users: %', left_over;
  end if;

  raise notice 'OK — žádné FK na auth.users u cards / bonus tabulek.';
end $$;

notify pgrst, 'reload schema';
