-- Jednorázová migrace: pravé křídlo se v aplikaci označuje PK (ne dřívější RK).
-- Spusť v Supabase SQL Editor.

update public.cards
set pozice = 'PK'
where pozice = 'RK';
