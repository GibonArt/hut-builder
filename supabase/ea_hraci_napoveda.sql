-- Jednorázově: nápověda jmen z EA ratings (odděleně od uživatelských karet v `cards`).
-- Po spuštění: lokálně `npm run ea-ratings` (SUPABASE_SERVICE_ROLE_KEY + URL v .env).

create table if not exists public.ea_hraci_napoveda (
  ea_player_id integer primary key,
  jmeno text not null,
  team_label text not null default '',
  position_short text not null default '',
  ea_rank integer not null,
  x_factors jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.ea_hraci_napoveda is 'Jen čtení pro přihlášené — nápověda při zadávání hráče; vlastní karty jsou v `cards` až po uložení formuláře.';

create index if not exists ea_hraci_napoveda_rank_idx
  on public.ea_hraci_napoveda (ea_rank asc);

create index if not exists ea_hraci_napoveda_jmeno_idx
  on public.ea_hraci_napoveda (lower(jmeno));

alter table public.ea_hraci_napoveda enable row level security;

drop policy if exists "ea_hraci_napoveda_select_authenticated" on public.ea_hraci_napoveda;
create policy "ea_hraci_napoveda_select_authenticated"
  on public.ea_hraci_napoveda for select
  to authenticated
  using (true);

grant select on public.ea_hraci_napoveda to authenticated;
