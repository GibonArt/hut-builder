-- Spusť celý skript v Supabase: SQL Editor → New query → Paste → Run
-- Odpovídá polím HutCard v aplikaci (kromě id = card_slug v tabulce).

-- Tabulka karet (vlastník = přihlášený uživatel; nápověda jmen napříč uživateli přes RPC napoveda_jmena_z_cards)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_slug text not null,
  jmeno text not null,
  ovr smallint not null check (ovr >= 0 and ovr <= 99),
  pozice text not null,
  preferovana_ruka text not null,
  narodnost text not null,
  tym text not null,
  liga text not null,
  typ_karty text not null,
  plat numeric not null,
  ap smallint null,
  atributy jsonb null, -- rozšíření: objekt s polem xFactory (max 3 X-Faktory z EA / ručně)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_slug)
);

create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_jmeno_ovr_idx on public.cards (lower(jmeno), ovr);

create or replace function public.set_cards_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute procedure public.set_cards_updated_at();

alter table public.cards enable row level security;

create policy "cards_select_own"
  on public.cards for select
  using (auth.uid() = user_id);

-- Nápověda EA: supabase/ea_hraci_napoveda.sql + napoveda_jmena_z_cards_rpc.sql

create policy "cards_insert_own"
  on public.cards for insert
  with check (auth.uid() = user_id);

create policy "cards_update_own"
  on public.cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cards_delete_own"
  on public.cards for delete
  using (auth.uid() = user_id);
