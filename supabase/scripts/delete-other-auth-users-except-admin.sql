-- ⚠️  VAROVÁNÍ: Sdílený Supabase s hut-turnaj!
-- Smazání auth.users ovlivní i přihlášení do turnaje (stejná DB).
-- Používej jen pokud turnaj nepotřebuje ostatní účty, nebo máš zálohu.
--
-- Nechá pouze gibonart@gmail.com. Karty už máš pod adminem (assign-all-cards).
-- bonus_kombinace_nastaveni u smazaných účtů zmizí (ON DELETE CASCADE).
--
-- Spusť na NAS:
--   cd /volume1/docker/supabase-project
--   sudo docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < /volume1/docker/hut-builder/supabase/scripts/delete-other-auth-users-except-admin.sql

\set admin_email 'gibonart@gmail.com'

\echo '=== Uživatelé před smazáním ==='
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at;

\echo '=== Ke smazání (všichni kromě admina) ==='
SELECT count(*) AS pocet_ke_smazani
FROM auth.users
WHERE lower(trim(email)) <> lower(trim(:'admin_email'));

DO $$
DECLARE
  admin_id uuid;
  pred bigint;
  po bigint;
BEGIN
  SELECT id INTO admin_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim('gibonart@gmail.com'))
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin účet gibonart@gmail.com neexistuje v auth.users';
  END IF;

  SELECT count(*) INTO pred FROM auth.users;

  -- Auth relace (pořadí kvůli FK v auth schématu)
  DELETE FROM auth.sessions WHERE user_id IS DISTINCT FROM admin_id;
  DELETE FROM auth.refresh_tokens WHERE user_id IS DISTINCT FROM admin_id;
  DELETE FROM auth.mfa_factors WHERE user_id IS DISTINCT FROM admin_id;
  DELETE FROM auth.one_time_tokens WHERE user_id IS DISTINCT FROM admin_id;
  DELETE FROM auth.identities WHERE user_id IS DISTINCT FROM admin_id;
  DELETE FROM auth.users WHERE id IS DISTINCT FROM admin_id;

  SELECT count(*) INTO po FROM auth.users;

  RAISE NOTICE 'Smazáno % uživatelů, zbývá %', pred - po, po;
END $$;

\echo '=== Uživatelé po smazání ==='
SELECT id, email, created_at FROM auth.users;

\echo '=== Karet u admina ==='
SELECT count(*) FROM public.cards c
JOIN auth.users u ON u.id = c.user_id
WHERE lower(u.email) = lower(trim(:'admin_email'));
