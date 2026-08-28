-- Přiřadí všechny karty jednomu admin účtu (gibonart@gmail.com).
-- Pro soukromé nasazení — tool už nebude veřejný.
--
-- Spusť na NAS:
--   cd /volume1/docker/supabase-project
--   sudo docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < /volume1/docker/hut-builder/supabase/scripts/assign-all-cards-to-admin.sql

\set admin_email 'gibonart@gmail.com'

\echo '=== Před ==='
SELECT count(*) AS karet_celkem FROM public.cards;
SELECT u.email, count(c.id) AS pocet
FROM auth.users u
LEFT JOIN public.cards c ON c.user_id = u.id
WHERE lower(u.email) = lower(:'admin_email')
GROUP BY u.email;

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

  SELECT count(*) INTO pred FROM public.cards;

  UPDATE public.cards SET user_id = admin_id;

  SELECT count(*) INTO po FROM public.cards WHERE user_id = admin_id;

  RAISE NOTICE 'Přiřazeno % karet pod % (%)', po, admin_id, 'gibonart@gmail.com';
END $$;

\echo '=== Po ==='
SELECT count(*) AS karet_celkem FROM public.cards;
SELECT u.email, count(c.id) AS pocet
FROM auth.users u
LEFT JOIN public.cards c ON c.user_id = u.id
WHERE lower(u.email) = lower(:'admin_email')
GROUP BY u.email;

SELECT count(*) AS sirotci
FROM public.cards c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE u.id IS NULL;
