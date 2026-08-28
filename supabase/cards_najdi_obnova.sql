-- Oprava: vytvoří cards_najdi_id_shodneho_obsahu (bez X-Faktorů) + granty.
-- Spusť, pokud cards_katalog_kopie_rpc.sql spadl uprostřed nebo jsi přeskočil na data_api_grants.
-- Po úspěchu můžeš spustit zbytek cards_katalog_kopie_rpc.sql (kopie z katalogu) nebo celý ten soubor znovu.

drop function if exists public.cards_najdi_id_shodneho_obsahu(
  text,
  smallint,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  smallint,
  jsonb
);
drop function if exists public.cards_najdi_id_shodneho_obsahu(
  text,
  smallint,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  smallint
);

create or replace function public.cards_najdi_id_shodneho_obsahu(
  p_jmeno text,
  p_ovr smallint,
  p_pozice text,
  p_preferovana_ruka text,
  p_narodnost text,
  p_tym text,
  p_liga text,
  p_typ_karty text,
  p_plat numeric,
  p_ap smallint
) returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.cards c
  where
    trim(c.jmeno) = trim(p_jmeno)
    and c.ovr = p_ovr
    and c.pozice = p_pozice
    and c.preferovana_ruka = p_preferovana_ruka
    and trim(c.narodnost) = trim(p_narodnost)
    and trim(c.tym) = trim(p_tym)
    and c.liga = p_liga
    and c.typ_karty = p_typ_karty
    and c.plat = p_plat
    and (
      (c.ap is null and p_ap is null)
      or (c.ap = p_ap)
    )
  limit 1;
$$;

revoke all on function public.cards_najdi_id_shodneho_obsahu(
  text, smallint, text, text, text, text, text, text, numeric, smallint
) from public;
grant execute on function public.cards_najdi_id_shodneho_obsahu(
  text, smallint, text, text, text, text, text, text, numeric, smallint
) to authenticated, service_role;
