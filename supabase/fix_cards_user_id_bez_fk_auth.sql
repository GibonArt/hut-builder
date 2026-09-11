-- Sdílené Auth (NHL26) + data DB (NHL27): user_id v cards nesmí FK na lokální auth.users
-- (NHL27 auth.users je prázdné → INSERT karty padá i když JWT/RLS sedí).
--
-- Spusť na NHL27:
--   cd /volume1/docker/supabase-nhl27
--   sudo docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < /volume1/docker/hut-builder/supabase/fix_cards_user_id_bez_fk_auth.sql

alter table public.cards
  drop constraint if exists cards_user_id_fkey;

-- Per-user bonus nastavení (pokud tabulka existuje)
alter table public.bonus_kombinace_nastaveni
  drop constraint if exists bonus_kombinace_nastaveni_user_id_fkey;

notify pgrst, 'reload schema';
