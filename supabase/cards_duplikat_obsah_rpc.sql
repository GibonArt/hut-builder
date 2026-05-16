-- Kontrola duplicitního obsahu karty pouze uvnitř inventáře daného uživatele (stejná sada polí
-- jako u jiného jeho řádku v `cards`). Jiný účet se shodným střídáním tedy nebrání uložení.
-- Spusť v Supabase SQL Editor po cards_setup.sql.
-- Aplikace volá přes supabase.rpc('cards_ma_duplicitni_obsah', …).
--
-- Migrace: staré signatury funkce, aby se po úpravách vytvořila právě jedna verze.
drop function if exists public.cards_ma_duplicitni_obsah(
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
);
drop function if exists public.cards_ma_duplicitni_obsah(
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
  uuid,
  text
);

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
  p_pouze_pro_user_id uuid,
  p_prodano boolean,
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
      c.user_id = p_pouze_pro_user_id
      and c.prodano is not distinct from p_prodano
      and trim(c.jmeno) = trim(p_jmeno)
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
  boolean,
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
  boolean,
  uuid,
  text
) to authenticated;
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
  boolean,
  uuid,
  text
) to service_role;

comment on function public.cards_ma_duplicitni_obsah is
  'Vrací true, pokud tento uživatel už má jiný řádek se shodným obsahem polí (včetně prodáno). Volitelně vyloučí jeden slug (úprava vlastní karty).';
