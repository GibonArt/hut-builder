-- Sloupec „prodáno“: karta zůstane v DB (pro komunitu / duplicity), ale nejde do optimalizátoru.
-- Spusť v Supabase SQL Editor po nasazení cards_setup.sql.

alter table public.cards
  add column if not exists prodano boolean not null default false;

comment on column public.cards.prodano is
  'Uživatel označil kartu jako prodanou — nezahrnuje se do výpočtu formací v optimalizátoru.';

-- Kopie z katalogu: nový řádek má vždy prodano = false.
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
      and public.typ_karty_kanonicky(c.typ_karty) = public.typ_karty_kanonicky((v_src).typ_karty)
      and c.plat = (v_src).plat
      and (
        (c.ap is null and (v_src).ap is null)
        or (c.ap = (v_src).ap)
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
grant execute on function public.cards_kopiruj_kartu_do_inventare(uuid, text) to authenticated, service_role;
