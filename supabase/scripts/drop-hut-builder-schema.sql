-- Smaže tabulky a funkce HUT Builder v public (auth.users zůstane — sdílené s hut-turnaj).
-- Spusť jen před čistou migrací schématu HUT (--reset v migrate-selfhosted.sh).

drop trigger if exists cards_set_updated_at on public.cards;
drop trigger if exists bonus_kombinace_global_set_updated_at on public.bonus_kombinace_global;
drop trigger if exists bonus_kombinace_nastaveni_set_updated_at on public.bonus_kombinace_nastaveni;

drop table if exists public.cards cascade;
drop table if exists public.hut_typy_karet_dynamic cascade;
drop table if exists public.bonus_kombinace_global cascade;
drop table if exists public.bonus_kombinace_nastaveni cascade;
drop table if exists public.ea_hraci_napoveda cascade;

drop function if exists public.admin_prehled_uzivatelu_karet() cascade;
drop function if exists public.napoveda_jmena_z_cards() cascade;
drop function if exists public.cards_kopiruj_kartu_do_inventare(uuid, uuid) cascade;
drop function if exists public.cards_najdi_id_shodneho_obsahu(uuid, text, smallint, text, text, text, text, text, text, numeric, smallint, jsonb) cascade;
drop function if exists public.cards_globalni_katalog() cascade;
drop function if exists public.cards_ma_duplicitni_obsah(uuid, text, smallint, text, text, text, text, text, text, numeric, smallint, jsonb) cascade;
drop function if exists public.list_hut_typy_karet_dynamic() cascade;
drop function if exists public.sync_hut_typy_karet_dynamic(jsonb) cascade;
drop function if exists public.typ_karty_kanonicky(text) cascade;
drop function if exists public.je_bonus_kombinace_editor() cascade;
drop function if exists public.set_bonus_kombinace_updated_at() cascade;
drop function if exists public.set_cards_updated_at() cascade;
