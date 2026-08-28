-- Migrace existující tabulky `cards`: krestni_jmeno + prijmeni → jmeno
-- Na čerstvé instalaci (cards_setup.sql už má sloupec jmeno) se přeskočí.

alter table public.cards add column if not exists jmeno text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cards'
      and column_name = 'krestni_jmeno'
  ) then
    update public.cards
    set jmeno = trim(both from concat_ws(' ', nullif(trim(krestni_jmeno), ''), nullif(trim(prijmeni), '')))
    where jmeno is null or trim(jmeno) = '';

    update public.cards
    set jmeno = coalesce(nullif(trim(prijmeni), ''), 'Neznámý')
    where trim(coalesce(jmeno, '')) = '';
  end if;
end $$;

alter table public.cards alter column jmeno set not null;

alter table public.cards drop column if exists krestni_jmeno;
alter table public.cards drop column if exists prijmeni;

drop index if exists public.cards_prijmeni_ovr_idx;
create index if not exists cards_jmeno_ovr_idx on public.cards (lower(jmeno), ovr);

alter table public.cards drop column if exists ea_rank;
