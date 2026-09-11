-- Sdílené kombinace bonusů pro celou aplikaci (jeden zdroj pravdy).
-- Čtení: každý přihlášený uživatel (authenticated).
-- Zápis / mazání / úpravy řádků v tabulce: pouze e-maily uvedené v funkci níže
-- (musí odpovídat seznamu v `lib/bonusAdmin.ts` → `ADMIN_EMAILS_LOWER`).
--
-- Spusť v Supabase SQL Editoru. Po vytvoření můžeš jednorázově zkopírovat data ze
-- staré tabulky `bonus_kombinace_nastaveni` (volitelný blok na konci souboru).

create or replace function public.set_bonus_kombinace_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.bonus_kombinace_global (
  typ_kombinace text not null
    check (typ_kombinace in ('utocna', 'obranna')),
  radky jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  -- UUID editora (může být z Auth jiného stacku — bez FK na auth.users).
  updated_by uuid null,
  primary key (typ_kombinace)
);

-- Na sdíleném supabase-project může funkce existovat pod jiným ownerem (cloud / Studio).
drop function if exists public.je_bonus_kombinace_editor() cascade;

create or replace function public.je_bonus_kombinace_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Preferuj e-mail z JWT (sdílené Auth NHL26 → data NHL27 bez lokálního auth.users).
  -- Fallback: lokální auth.users (klasický single-stack).
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

drop trigger if exists bonus_kombinace_global_updated_at on public.bonus_kombinace_global;
create trigger bonus_kombinace_global_updated_at
  before insert or update on public.bonus_kombinace_global
  for each row execute procedure public.set_bonus_kombinace_updated_at();

grant select, insert, update, delete on public.bonus_kombinace_global to authenticated;
grant select, insert, update, delete on public.bonus_kombinace_global to service_role;

alter table public.bonus_kombinace_global enable row level security;

-- updated_by může být UUID z Auth NHL26, které v NHL27 auth.users není — bez FK.
alter table public.bonus_kombinace_global
  drop constraint if exists bonus_kombinace_global_updated_by_fkey;

drop policy if exists "bonus_global_select_authenticated" on public.bonus_kombinace_global;
create policy "bonus_global_select_authenticated"
  on public.bonus_kombinace_global
  for select
  to authenticated
  using (true);

drop policy if exists "bonus_global_insert_editor" on public.bonus_kombinace_global;
create policy "bonus_global_insert_editor"
  on public.bonus_kombinace_global
  for insert
  to authenticated
  with check (public.je_bonus_kombinace_editor());

drop policy if exists "bonus_global_update_editor" on public.bonus_kombinace_global;
create policy "bonus_global_update_editor"
  on public.bonus_kombinace_global
  for update
  to authenticated
  using (public.je_bonus_kombinace_editor())
  with check (public.je_bonus_kombinace_editor());

drop policy if exists "bonus_global_delete_editor" on public.bonus_kombinace_global;
create policy "bonus_global_delete_editor"
  on public.bonus_kombinace_global
  for delete
  to authenticated
  using (public.je_bonus_kombinace_editor());

-- Volitelně: vyplň řádky pro upsert (prázdné seznamy), aby select vždy našel oba typy
insert into public.bonus_kombinace_global (typ_kombinace, radky)
values ('utocna', '[]'::jsonb), ('obranna', '[]'::jsonb)
on conflict (typ_kombinace) do nothing;

-- --- Volitelná migrace ze staré per-user tabulky (admin účet) ---
-- insert into public.bonus_kombinace_global (typ_kombinace, radky, updated_by)
-- select b.typ_kombinace, b.radky, b.user_id
-- from public.bonus_kombinace_nastaveni b
-- join auth.users u on u.id = b.user_id
-- where lower(trim(u.email::text)) = 'gibonart@gmail.com'
-- on conflict (typ_kombinace) do update
--   set radky = excluded.radky,
--       updated_by = excluded.updated_by,
--       updated_at = now();
