-- Migrace existující tabulky `cards`: krestni_jmeno + prijmeni → jmeno
-- Spusť v Supabase SQL Editoru (jednou), pokud už máš starší schéma.

alter table public.cards add column if not exists jmeno text;

update public.cards
set jmeno = trim(both from concat_ws(' ', nullif(trim(krestni_jmeno), ''), nullif(trim(prijmeni), '')))
where jmeno is null or trim(jmeno) = '';

update public.cards
set jmeno = coalesce(nullif(trim(prijmeni), ''), 'Neznámý')
where trim(coalesce(jmeno, '')) = '';

alter table public.cards alter column jmeno set not null;

alter table public.cards drop column if exists krestni_jmeno;
alter table public.cards drop column if exists prijmeni;

drop index if exists public.cards_prijmeni_ovr_idx;
create index if not exists cards_jmeno_ovr_idx on public.cards (lower(jmeno), ovr);

alter table public.cards drop column if exists ea_rank;
