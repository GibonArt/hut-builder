-- Unikátní jména+tým ze všech řádků `cards` pro našeptávání (přihlášení vyžadováno).
-- Neprozrazuje celé karty cizích uživatelů — jen jmeno, tým, pozice, liga.
-- Spusť po cards_setup / migraci na sloupec `jmeno`.

create or replace function public.napoveda_jmena_z_cards()
returns table (
  jmeno text,
  tym text,
  pozice text,
  liga text,
  posledni_uprava timestamptz,
  preferovana_ruka text
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
    c.preferovana_ruka
  from public.cards c
  where trim(c.jmeno) <> ''
  order by lower(trim(c.jmeno)), lower(trim(c.tym)), c.updated_at desc;
$$;

revoke all on function public.napoveda_jmena_z_cards() from public;
grant execute on function public.napoveda_jmena_z_cards() to authenticated;

comment on function public.napoveda_jmena_z_cards() is 'Nápověda: agregace jmen z celé tabulky cards (RLS se obchází jen u vybraných sloupců včetně preferovana_ruka).';
