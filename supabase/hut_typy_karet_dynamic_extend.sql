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

-- PostgREST / supabase-js — doplnění oprávnění (idempotentní).
grant select, insert, update, delete on public.hut_typy_karet_dynamic to authenticated, service_role;

-- Obnov cache API (jinak supabase-js hlásí „schema cache“ i když sloupce v DB jsou).
notify pgrst, 'reload schema';

-- RPC obchází zastaralou PostgREST cache u přímého upsertu do tabulky.
create or replace function public.list_hut_typy_karet_dynamic()
returns table (
  hodnota_filtru text,
  jmeno_cs text,
  combo_soubor text,
  popis_cs text,
  aliases text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.hodnota_filtru,
    d.jmeno_cs,
    d.combo_soubor,
    d.popis_cs,
    d.aliases
  from public.hut_typy_karet_dynamic d
  order by d.hodnota_filtru;
$$;

create or replace function public.sync_hut_typy_karet_dynamic(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  if not public.je_bonus_kombinace_editor() then
    raise exception 'Pristup zamitnut';
  end if;

  insert into public.hut_typy_karet_dynamic (
    hodnota_filtru,
    jmeno_cs,
    combo_soubor,
    popis_cs,
    aliases,
    synced_at
  )
  select
    upper(trim(r->>'hodnota_filtru')),
    trim(r->>'jmeno_cs'),
    trim(r->>'combo_soubor'),
    nullif(trim(r->>'popis_cs'), ''),
    coalesce(
      (
        select array_agg(a order by ord)
        from jsonb_array_elements_text(coalesce(r->'aliases', '[]'::jsonb))
          with ordinality as t(a, ord)
      ),
      '{}'::text[]
    ),
    coalesce((r->>'synced_at')::timestamptz, now())
  from jsonb_array_elements(p_rows) as r
  where nullif(trim(r->>'hodnota_filtru'), '') is not null
    and nullif(trim(r->>'jmeno_cs'), '') is not null
    and nullif(trim(r->>'combo_soubor'), '') is not null
  on conflict (hodnota_filtru) do update set
    jmeno_cs = excluded.jmeno_cs,
    combo_soubor = excluded.combo_soubor,
    popis_cs = excluded.popis_cs,
    aliases = excluded.aliases,
    synced_at = excluded.synced_at;

  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.list_hut_typy_karet_dynamic() to authenticated, service_role;
grant execute on function public.sync_hut_typy_karet_dynamic(jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
