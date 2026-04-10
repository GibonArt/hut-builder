-- Po úvodním ea_hraci_napoveda.sql: přidej X-Faktory stažené z EA (jsonb pole abilities).
alter table public.ea_hraci_napoveda
  add column if not exists x_factors jsonb not null default '[]'::jsonb;

comment on column public.ea_hraci_napoveda.x_factors is 'Pole z EA ratings (playerAbilities): label, imageUrl, type — max 3 položky.';
