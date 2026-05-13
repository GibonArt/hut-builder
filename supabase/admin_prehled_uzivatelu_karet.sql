-- Přehled uživatelů a počtu karet — pouze pro admin e-mail (JWT).
-- Spusť v Supabase SQL Editoru (jako postgres / role s právem číst auth.users).

create or replace function public.admin_prehled_uzivatelu_karet()
returns table (
  user_id uuid,
  email text,
  registered_at timestamptz,
  pocet_karet bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'gibonart@gmail.com' then
    raise exception 'Přístup zamítnut';
  end if;

  return query
  select
    u.id,
    coalesce(u.email, '')::text,
    u.created_at,
    count(c.id)::bigint
  from auth.users u
  left join public.cards c on c.user_id = u.id
  group by u.id, u.email, u.created_at
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_prehled_uzivatelu_karet() from public;
grant execute on function public.admin_prehled_uzivatelu_karet() to authenticated;
grant execute on function public.admin_prehled_uzivatelu_karet() to service_role;

comment on function public.admin_prehled_uzivatelu_karet() is
  'Admin: seznam uživatelů a počet řádků v public.cards. Volitelné jen pro gibonart@gmail.com (JWT email).';
