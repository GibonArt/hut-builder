-- Doplnění explicitních GRANT pro PostgREST / supabase-js (Data API).
-- Supabase od května 2025 u nových projektů vyžaduje GRANT na nové tabulky v `public`;
-- u stávajících projektů je rozumné mít je v repu a jednou spustit v SQL Editoru.
--
-- Spusť v Supabase → SQL → celý soubor. Opakování je v pořádku (GRANT je idempotentní).
-- Nepřidáváme `anon` — aplikace nečte tyto tabulky bez přihlášení.

-- --- Tabulky ---
grant select, insert, update, delete on public.cards to authenticated, service_role;

grant select, insert, update, delete on public.bonus_kombinace_nastaveni to authenticated,
  service_role;

grant select, insert, update, delete on public.bonus_kombinace_global to authenticated,
  service_role;

grant select on public.ea_hraci_napoveda to authenticated;
grant select, insert, update, delete on public.ea_hraci_napoveda to service_role;

grant select, insert, update, delete on public.hut_typy_karet_dynamic to authenticated,
  service_role;

-- --- RPC / security definer (volání přes supabase.rpc) ---
grant execute on function public.je_bonus_kombinace_editor() to authenticated, service_role;

grant execute on function public.napoveda_jmena_z_cards() to authenticated, service_role;

grant execute on function public.admin_prehled_uzivatelu_karet() to authenticated, service_role;

revoke all on function public.cards_globalni_katalog() from public;
grant execute on function public.cards_globalni_katalog() to authenticated, service_role;

revoke all on function public.cards_najdi_id_shodneho_obsahu(
  text, smallint, text, text, text, text, text, text, numeric, smallint, jsonb
) from public;
grant execute on function public.cards_najdi_id_shodneho_obsahu(
  text, smallint, text, text, text, text, text, text, numeric, smallint, jsonb
) to authenticated, service_role;

revoke all on function public.cards_kopiruj_kartu_do_inventare(uuid, text) from public;
grant execute on function public.cards_kopiruj_kartu_do_inventare(uuid, text) to authenticated,
  service_role;

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
) to authenticated, service_role;
