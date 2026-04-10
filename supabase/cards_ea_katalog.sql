-- ZASTARALÉ: katalog byl v `cards` pod dedikovaným user_id.
-- Aktuální postup: supabase/ea_hraci_napoveda.sql + npm run ea-ratings (bez EA_CATALOG_USER_ID).
--
-- --- původní návod ---
-- EA NHL ratings jako řádky v existující tabulce `cards` (bez druhé tabulky).
--
-- Postup:
-- 1) Supabase → Authentication → Add user (např. email ea-catalog@local, libovolné heslo).
-- 2) Zkopíruj UUID tohoto uživatele.
-- 3) Nahraď níže všechny výskyty YOUR_EA_CATALOG_USER_UUID tímto UUID (tři místa: policy + index + komentář).
-- 4) Spusť tento skript v SQL Editoru.
-- 5) Do .env.local: NEXT_PUBLIC_EA_CATALOG_USER_ID=<stejné UUID>
-- 6) npm run ea-ratings (potřebuje SUPABASE_SERVICE_ROLE_KEY)
--
-- Volitelně na konci: odstranění předchozí samostatné tabulky (pokud existovala).
-- drop table if exists public.ea_nhl26_ratings;

alter table public.cards add column if not exists ea_rank smallint null;

comment on column public.cards.ea_rank is 'Jen řádky EA katalogu (user_id = katalog): pořadí z EA ratings. Ostatní NULL.';

-- Čtení katalogu všem přihlášeným (stejně jako dřív ea_nhl26_ratings).
drop policy if exists "cards_select_ea_katalog" on public.cards;
create policy "cards_select_ea_katalog"
  on public.cards for select
  using (user_id = 'YOUR_EA_CATALOG_USER_UUID'::uuid);

create index if not exists cards_ea_katalog_user_rank_idx
  on public.cards (user_id, ea_rank asc nulls last)
  where ea_rank is not null;
