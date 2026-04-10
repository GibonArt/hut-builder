-- Globální kontrola duplicitního obsahu karty (stejná data jako u jiného řádku v `cards`, libovolný uživatel).
-- Spusť v Supabase SQL Editor po cards_setup.sql.
-- Aplikace volá přes supabase.rpc('cards_ma_duplicitni_obsah', …).

create or replace function public.cards_ma_duplicitni_obsah(
  p_jmeno text,
  p_ovr smallint,
  p_pozice text,
  p_preferovana_ruka text,
  p_narodnost text,
  p_tym text,
  p_liga text,
  p_typ_karty text,
  p_plat numeric,
  p_ap smallint,
  p_atributy jsonb,
  p_vyloucit_user_id uuid default null,
  p_vyloucit_card_slug text default null
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
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
      and (
        (c.atributy is null and (p_atributy is null))
        or (c.atributy is not null and p_atributy is not null and c.atributy = p_atributy)
      )
      and not (
        p_vyloucit_user_id is not null
        and p_vyloucit_card_slug is not null
        and c.user_id = p_vyloucit_user_id
        and c.card_slug = p_vyloucit_card_slug
      )
  );
$$;

revoke all on function public.cards_ma_duplicitni_obsah(
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
  jsonb,
  uuid,
  text
) from public;

grant execute on function public.cards_ma_duplicitni_obsah(
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
  jsonb,
  uuid,
  text
) to authenticated;

comment on function public.cards_ma_duplicitni_obsah is
  'Vrací true, pokud už existuje karta se shodným obsahem polí (napříč uživateli). Volitelně vyloučí jeden řádek (úprava vlastní karty).';
