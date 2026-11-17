-- Katalog karet z NHL HUT Builder (cards.php / find_cards + popup).
-- NENÍ inventář uživatele — žádné user_id, nepatří do `cards`, neukazuje se v Můj inventář / Moje karty.
-- Čtení: authenticated. Zápis: editoři bonusů (`je_bonus_kombinace_editor`) + service_role.

create table if not exists public.hutbuilder_katalog_karet (
  hb_id integer not null,
  hb_typ text not null check (hb_typ in ('player', 'goalie')),
  jmeno text not null,
  ovr smallint not null check (ovr >= 0 and ovr <= 99),
  pozice text not null,
  preferovana_ruka text not null,
  narodnost text not null,
  tym text not null,
  liga text not null,
  typ_karty text not null,
  plat numeric not null default 0,
  ap smallint null,
  x_factors jsonb null,
  card_art_path text null,
  synced_at timestamptz not null default now(),
  zdroj text not null default 'hutbuilder',
  primary key (hb_id)
);

comment on table public.hutbuilder_katalog_karet is
  'Katalog HUT karet stažený z nhlhutbuilder.com. Oddělený od inventáře (public.cards) — synchrované karty se v inventáři nezobrazují.';

create index if not exists hutbuilder_katalog_karet_jmeno_idx
  on public.hutbuilder_katalog_karet (lower(jmeno));
create index if not exists hutbuilder_katalog_karet_ovr_idx
  on public.hutbuilder_katalog_karet (ovr desc);
create index if not exists hutbuilder_katalog_karet_typ_pozice_idx
  on public.hutbuilder_katalog_karet (typ_karty, pozice);

alter table public.hutbuilder_katalog_karet enable row level security;

drop policy if exists "hutbuilder_katalog_select_auth" on public.hutbuilder_katalog_karet;
create policy "hutbuilder_katalog_select_auth"
  on public.hutbuilder_katalog_karet
  for select
  to authenticated
  using (true);

drop policy if exists "hutbuilder_katalog_insert_editor" on public.hutbuilder_katalog_karet;
create policy "hutbuilder_katalog_insert_editor"
  on public.hutbuilder_katalog_karet
  for insert
  to authenticated
  with check (public.je_bonus_kombinace_editor());

drop policy if exists "hutbuilder_katalog_update_editor" on public.hutbuilder_katalog_karet;
create policy "hutbuilder_katalog_update_editor"
  on public.hutbuilder_katalog_karet
  for update
  to authenticated
  using (public.je_bonus_kombinace_editor())
  with check (public.je_bonus_kombinace_editor());

drop policy if exists "hutbuilder_katalog_delete_editor" on public.hutbuilder_katalog_karet;
create policy "hutbuilder_katalog_delete_editor"
  on public.hutbuilder_katalog_karet
  for delete
  to authenticated
  using (public.je_bonus_kombinace_editor());

grant select on public.hutbuilder_katalog_karet to authenticated;
grant insert, update, delete on public.hutbuilder_katalog_karet to authenticated;
grant select, insert, update, delete on public.hutbuilder_katalog_karet to service_role;

notify pgrst, 'reload schema';
