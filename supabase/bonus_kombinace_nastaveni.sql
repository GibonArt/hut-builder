-- Per-user nastavení (legacy). Aktuální aplikace ukládá sdílené kombinace do
-- `bonus_kombinace_global.sql` — tuto tabulku můžeš nechat pro zálohu / migraci.
--
-- Nastavení parametrů kombinací pro výpočet synergií (stránka Nastavení bonusů).
-- Spusť v Supabase SQL Editoru po přihlášení.
--
-- Sloupec `radky` je jsonb pole objektů. Aktuální tvar jedné kombinace:
--   { "p1": …, "p2": …, "p3": …,
--     "bonus_hodnota": <number>, "bonus_typ": "PLAT" | "CLK" | "BS" (legacy: SAL, AP) }
-- Starší uložené řádky { narodnost_kod, liga, tym, typ_karty } aplikace při načtení převede na p1–p3.

create table if not exists public.bonus_kombinace_nastaveni (
  user_id uuid not null references auth.users (id) on delete cascade,
  typ_kombinace text not null check (typ_kombinace in ('utocna', 'obranna')),
  radky jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, typ_kombinace)
);

create index if not exists bonus_kombinace_nastaveni_user_idx
  on public.bonus_kombinace_nastaveni (user_id);

create or replace function public.set_bonus_kombinace_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bonus_kombinace_set_updated_at on public.bonus_kombinace_nastaveni;
create trigger bonus_kombinace_set_updated_at
  before insert or update on public.bonus_kombinace_nastaveni
  for each row execute procedure public.set_bonus_kombinace_updated_at();

alter table public.bonus_kombinace_nastaveni enable row level security;

create policy "bonus_kombinace_select_own"
  on public.bonus_kombinace_nastaveni for select
  using (auth.uid() = user_id);

create policy "bonus_kombinace_insert_own"
  on public.bonus_kombinace_nastaveni for insert
  with check (auth.uid() = user_id);

create policy "bonus_kombinace_update_own"
  on public.bonus_kombinace_nastaveni for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "bonus_kombinace_delete_own"
  on public.bonus_kombinace_nastaveni for delete
  using (auth.uid() = user_id);
