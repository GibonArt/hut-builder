-- Oprava RPC sync_hut_typy_karet_dynamic: service_role nemá auth.uid(), RPC padalo na „Pristup zamitnut“.
-- Spusť na NAS:
--   cd /volume1/docker/supabase-project
--   sudo docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < /volume1/docker/hut-builder/supabase/fix_sync_hut_typy_karet_service_role.sql

create or replace function public.sync_hut_typy_karet_dynamic(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and not public.je_bonus_kombinace_editor() then
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

grant execute on function public.sync_hut_typy_karet_dynamic(jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
