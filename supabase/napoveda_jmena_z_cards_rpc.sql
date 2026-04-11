-- Unikátní jména+tým ze všech řádků `cards` pro našeptávání (přihlášení vyžadováno).
-- K dané dvojici jméno+tým se berou údaje z nejnověji upravené karty (DISTINCT ON … updated_at desc).
-- Spusť po cards_setup / migraci na sloupec `jmeno`.
-- Při změně návratových sloupců je nutné starou funkci zahodit (PostgreSQL nepovolí jen REPLACE).
drop function if exists public.napoveda_jmena_z_cards();

create or replace function public.napoveda_jmena_z_cards()
returns table (
  jmeno text,
  tym text,
  pozice text,
  liga text,
  posledni_uprava timestamptz,
  preferovana_ruka text,
  ovr smallint,
  plat numeric,
  narodnost text,
  typ_karty text,
  atributy jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (lower(trim(c.jmeno)), lower(trim(c.tym)))
    trim(c.jmeno),
    trim(c.tym),
    c.pozice,
    c.liga,
    c.updated_at,
    c.preferovana_ruka,
    c.ovr,
    c.plat,
    c.narodnost,
    c.typ_karty,
    c.atributy
  from public.cards c
  where trim(c.jmeno) <> ''
  order by lower(trim(c.jmeno)), lower(trim(c.tym)), c.updated_at desc;
$$;

revoke all on function public.napoveda_jmena_z_cards() from public;
grant execute on function public.napoveda_jmena_z_cards() to authenticated;

comment on function public.napoveda_jmena_z_cards() is
  'Nápověda: agregace jmen z cards + OVR, plat, národnost, typ karty, atributy z poslední úpravy daného jména+týmu.';
