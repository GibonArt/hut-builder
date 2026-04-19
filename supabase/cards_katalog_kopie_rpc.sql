-- Globální katalog karet + kopie do inventáře přihlášeného uživatele.
-- Spusť v Supabase SQL Editor po cards_setup.sql a cards_duplikat_obsah_rpc.sql.

-- 1) Všechny karty jiných uživatelů (pro výběr v UI; vlastní řádky vynechány).
create or replace function public.cards_globalni_katalog()
returns table (
  card_id uuid,
  jmeno text,
  ovr smallint,
  pozice text,
  preferovana_ruka text,
  narodnost text,
  tym text,
  liga text,
  typ_karty text,
  plat numeric,
  ap smallint,
  atributy jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.jmeno,
    c.ovr,
    c.pozice,
    c.preferovana_ruka,
    c.narodnost,
    c.tym,
    c.liga,
    c.typ_karty,
    c.plat,
    c.ap,
    c.atributy
  from public.cards c
  where c.user_id <> auth.uid()
  order by lower(trim(c.jmeno)), c.ovr, c.jmeno;
$$;

revoke all on function public.cards_globalni_katalog() from public;
grant execute on function public.cards_globalni_katalog() to authenticated;

comment on function public.cards_globalni_katalog is
  'Seznam karet ostatních uživatelů pro přidání kopie do vlastního inventáře.';

-- 2) Najde UUID prvního řádku se shodným obsahem (libovolný uživatel).
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
  p_ap smallint,
  p_atributy jsonb
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
    and (
      (c.atributy is null and (p_atributy is null))
      or (c.atributy is not null and p_atributy is not null and c.atributy = p_atributy)
    )
  limit 1;
$$;

revoke all on function public.cards_najdi_id_shodneho_obsahu(
  text, smallint, text, text, text, text, text, text, numeric, smallint, jsonb
) from public;
grant execute on function public.cards_najdi_id_shodneho_obsahu(
  text, smallint, text, text, text, text, text, text, numeric, smallint, jsonb
) to authenticated;

-- 3) Zkopíruje obsah karty (podle UUID řádku) do inventáře volajícího s novým slugem.
create or replace function public.cards_kopiruj_kartu_do_inventare(
  p_zdroj_card_id uuid,
  p_novy_card_slug text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.cards%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_novy_card_slug is null or trim(p_novy_card_slug) = '' then
    raise exception 'invalid slug';
  end if;

  select * into v_src from public.cards where id = p_zdroj_card_id;
  if not found then
    raise exception 'zdroj nenalezen';
  end if;

  if v_src.user_id = auth.uid() then
    raise exception 'vlastni_karta';
  end if;

  if exists (
    select 1
    from public.cards c
    where c.user_id = auth.uid()
      and c.card_slug = p_novy_card_slug
  ) then
    raise exception 'slug_exists';
  end if;

  if exists (
    select 1
    from public.cards c
    where c.user_id = auth.uid()
      and trim(c.jmeno) = trim((v_src).jmeno)
      and c.ovr = (v_src).ovr
      and c.pozice = (v_src).pozice
      and c.preferovana_ruka = (v_src).preferovana_ruka
      and trim(c.narodnost) = trim((v_src).narodnost)
      and trim(c.tym) = trim((v_src).tym)
      and c.liga = (v_src).liga
      and c.typ_karty = (v_src).typ_karty
      and c.plat = (v_src).plat
      and (
        (c.ap is null and (v_src).ap is null)
        or (c.ap = (v_src).ap)
      )
      and (
        (c.atributy is null and (v_src).atributy is null)
        or (c.atributy = (v_src).atributy)
      )
  ) then
    raise exception 'jiz_v_inventari';
  end if;

  insert into public.cards (
    user_id,
    card_slug,
    jmeno,
    ovr,
    pozice,
    preferovana_ruka,
    narodnost,
    tym,
    liga,
    typ_karty,
    plat,
    ap,
    atributy,
    prodano
  )
  values (
    auth.uid(),
    p_novy_card_slug,
    (v_src).jmeno,
    (v_src).ovr,
    (v_src).pozice,
    (v_src).preferovana_ruka,
    (v_src).narodnost,
    (v_src).tym,
    (v_src).liga,
    (v_src).typ_karty,
    (v_src).plat,
    (v_src).ap,
    (v_src).atributy,
    false
  );
end;
$$;

revoke all on function public.cards_kopiruj_kartu_do_inventare(uuid, text) from public;
grant execute on function public.cards_kopiruj_kartu_do_inventare(uuid, text) to authenticated;

comment on function public.cards_kopiruj_kartu_do_inventare is
  'Vloží kopii karty jiného uživatele do inventáře přihlášeného účtu (nový card_slug).';
