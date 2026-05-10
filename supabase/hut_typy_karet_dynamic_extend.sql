-- Rozšíření tabulky dynamických typů karet (volitelné — po základním `hut_typy_karet_dynamic.sql`).
-- Spusť v Supabase SQL Editoru.

alter table public.hut_typy_karet_dynamic
  add column if not exists popis_cs text;

alter table public.hut_typy_karet_dynamic
  add column if not exists aliases text[] not null default '{}';

comment on column public.hut_typy_karet_dynamic.popis_cs is
  'Dlouhý popisek pro UI; přepíše statický popis při sloučení se statickým katalogem.';

comment on column public.hut_typy_karet_dynamic.aliases is
  'Alternativní zápisy typu (zkratky, EA text) → mapují na hodnota_filtru při vyhledávání meta.';
