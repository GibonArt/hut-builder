-- Dynamické typy karet (sync z NHL HUT Builder Combo Finder).
-- Doplňuje / přepisuje ikony a zobrazení oproti statickému `lib/hutdbTypKaret.ts`.
-- Čtení: authenticated. Zápis: stejní editoři jako `bonus_kombinace_global` (`je_bonus_kombinace_editor`).
--
-- Spustitelné samostatně. Funkce editora musí sedět s `lib/bonusAdmin.ts` (a bonus_kombinace_global.sql).

create or replace function public.je_bonus_kombinace_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select lower(trim(u.email::text)) in (
        'gibonart@gmail.com'
      )
      from auth.users u
      where u.id = auth.uid()
    ),
    false
  );
$$;

comment on function public.je_bonus_kombinace_editor() is
  'true jen pro účty, které smí měnit sdílené bonus kombinace a sync typů karet; drž v souladu s lib/bonusAdmin.ts';

grant execute on function public.je_bonus_kombinace_editor() to authenticated;
grant execute on function public.je_bonus_kombinace_editor() to service_role;

create table if not exists public.hut_typy_karet_dynamic (
  hodnota_filtru text not null,
  jmeno_cs text not null,
  combo_soubor text not null,
  popis_cs text,
  aliases text[] not null default '{}',
  synced_at timestamptz not null default now(),
  primary key (hodnota_filtru)
);

comment on table public.hut_typy_karet_dynamic is
  'HUT typy karet synchronizované z webu; aplikace je sloučí se statickým katalogem v hutdbTypKaret.ts';

alter table public.hut_typy_karet_dynamic enable row level security;

drop policy if exists "hut_typy_dynamic_select_auth" on public.hut_typy_karet_dynamic;
create policy "hut_typy_dynamic_select_auth"
  on public.hut_typy_karet_dynamic
  for select
  to authenticated
  using (true);

drop policy if exists "hut_typy_dynamic_insert_editor" on public.hut_typy_karet_dynamic;
create policy "hut_typy_dynamic_insert_editor"
  on public.hut_typy_karet_dynamic
  for insert
  to authenticated
  with check (public.je_bonus_kombinace_editor());

drop policy if exists "hut_typy_dynamic_update_editor" on public.hut_typy_karet_dynamic;
create policy "hut_typy_dynamic_update_editor"
  on public.hut_typy_karet_dynamic
  for update
  to authenticated
  using (public.je_bonus_kombinace_editor())
  with check (public.je_bonus_kombinace_editor());

drop policy if exists "hut_typy_dynamic_delete_editor" on public.hut_typy_karet_dynamic;
create policy "hut_typy_dynamic_delete_editor"
  on public.hut_typy_karet_dynamic
  for delete
  to authenticated
  using (public.je_bonus_kombinace_editor());

grant select on public.hut_typy_karet_dynamic to authenticated;
grant insert, update, delete on public.hut_typy_karet_dynamic to authenticated;
grant select, insert, update, delete on public.hut_typy_karet_dynamic to service_role;

notify pgrst, 'reload schema';
