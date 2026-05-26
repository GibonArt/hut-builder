-- Kanonizace typ_karty pro kontrolu duplicit (TOTW → TEAM OF THE WEEK, …).
-- Drž v souladu s ALIAS_NA_FILTR v lib/hutdbTypKaret.ts.
-- Spusť v Supabase SQL Editoru před cards_duplikat_obsah_rpc.sql (nebo znovu spusť duplicit RPC).

create or replace function public.typ_karty_kanonicky(p text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := upper(trim(coalesce(p, '')));
  nxt text;
  i int := 0;
begin
  if v = '' then
    return '';
  end if;
  loop
    nxt := case v
      when 'CHASE CAPTAINS' then 'CAPTAINS'
      when 'TOTW' then 'TEAM OF THE WEEK'
      when 'TOTY' then 'TEAM OF THE YEAR'
      when 'TOTS' then 'TEAM OF THE SEASON'
      when 'TOTM' then 'STARS OF THE MONTH'
      when 'SOTM' then 'STARS OF THE MONTH'
      when 'BA' then 'BASE'
      when 'ICON' then 'ICONS'
      when 'ROOK' then 'ROOKIES'
      when 'FANT' then 'FANTASY HOCKEY'
      when 'GOG' then 'GALLERY OF GREATS'
      when 'HUTC' then 'HUT CHAMPIONS'
      when 'HBM' then 'HUT BEAST MODE'
      when 'BEAST' then 'HUT BEAST MODE'
      when 'GB' then 'HUT GAME BREAKERS'
      when 'HH' then 'HUT HEROES'
      when 'ODR' then 'HUT ODR SZN'
      when 'MARQ' then 'MARQUEE'
      when 'MILE' then 'MILESTONES'
      when 'RB' then 'RECORD BREAKERS'
      when 'SO' then 'SUPERSTAR ORIGINS'
      when 'IG' then 'IGNITED'
      when 'PIN' then 'PINNACLE'
      when 'CAP' then 'CAPTAINS'
      when 'CHASE' then 'CAPTAINS'
      when 'CCAP' then 'CAPTAINS'
      when 'CHCAP' then 'CAPTAINS'
      when 'CN' then 'COMBO NEXUS'
      when 'NEXUS' then 'COMBO NEXUS'
      when 'FACEOFF' then 'FACEOFF: INSIDE THE NHL'
      when 'FITN' then 'FACEOFF: INSIDE THE NHL'
      when 'NG' then 'NEXT GEN'
      when 'NXG' then 'NEXT GEN'
      when 'NEXTGEN' then 'NEXT GEN'
      when 'CMG' then 'CHECK MY GAME'
      when 'GM' then 'GRUDGE MATCH'
      when 'HRS' then 'HUT RANKED SEASONS'
      when 'CHEL' then 'CHEL WEEK'
      when 'ALUM' then 'ALUMNI'
      when 'FI' then 'FRESH ICE'
      when 'FL' then 'HUT FINISH LINE'
      when 'HFL' then 'HUT FINISH LINE'
      when 'FINISH LINE' then 'HUT FINISH LINE'
      when 'PRO' then 'PROTOTYPES'
      when 'SPOT' then 'SPOTLIGHT'
      when 'SCP' then 'STANLEY CUP PLAYOFFS'
      when 'SCPP' then 'STANLEY CUP PLAYOFFS'
      when 'PC' then 'PLAYOFF CHEM'
      when 'PLAYOFF' then 'PLAYOFF CHEM'
      when 'TQ' then 'TRADE QUEST'
      when 'TRAN' then 'TRANSACTIONS'
      when 'NHL26' then '26'
      else null
    end;
    exit when nxt is null or nxt = v;
    v := nxt;
    i := i + 1;
    exit when i >= 16;
  end loop;
  return v;
end;
$$;

revoke all on function public.typ_karty_kanonicky(text) from public;
grant execute on function public.typ_karty_kanonicky(text) to authenticated, service_role;

comment on function public.typ_karty_kanonicky(text) is
  'Mapuje alias typ_karty na kanonický filtr (shodně s lib/hutdbTypKaret.ts) — pro duplicitní kontrolu.';
