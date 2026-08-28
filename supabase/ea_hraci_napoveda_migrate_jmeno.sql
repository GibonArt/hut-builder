-- Migrace ea_hraci_napoveda: krestni_jmeno + prijmeni → jmeno (po úpravě skriptu ea-ratings)

alter table public.ea_hraci_napoveda add column if not exists jmeno text;

update public.ea_hraci_napoveda
set jmeno = trim(both from concat_ws(' ', nullif(trim(krestni_jmeno), ''), nullif(trim(prijmeni), '')))
where jmeno is null or trim(jmeno) = '';

update public.ea_hraci_napoveda
set jmeno = 'Neznámý'
where trim(coalesce(jmeno, '')) = '';

alter table public.ea_hraci_napoveda alter column jmeno set not null;

alter table public.ea_hraci_napoveda drop column if exists krestni_jmeno;
alter table public.ea_hraci_napoveda drop column if exists prijmeni;

drop index if exists public.ea_hraci_napoveda_prijmeni_idx;
create index if not exists ea_hraci_napoveda_jmeno_idx on public.ea_hraci_napoveda (lower(jmeno));

alter table public.ea_hraci_napoveda drop column if exists ovr;
