-- Přiřadí všechny karty jednomu admin účtu (gibonart@gmail.com).
-- Pro soukromé nasazení — tool už nebude veřejný.
--
-- Unikátní (user_id, card_slug): u duplicit nechá adminovu kartu, cizí stejný slug smaže.
-- U sirotčích karet se stejným slugem nechá jednu kopii (nejstarší id).
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
  smazano_kolize_admin bigint;
  smazano_kolize_mezi_cizimi bigint;
  prirazeno bigint;
BEGIN
  SELECT id INTO admin_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim('gibonart@gmail.com'))
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin účet gibonart@gmail.com neexistuje v auth.users';
  END IF;

  -- Cizí karta se stejným slugem jako už má admin → smaž (adminova verze zůstane).
  DELETE FROM public.cards c
  WHERE c.user_id IS DISTINCT FROM admin_id
    AND EXISTS (
      SELECT 1
      FROM public.cards a
      WHERE a.user_id = admin_id
        AND a.card_slug = c.card_slug
    );
  GET DIAGNOSTICS smazano_kolize_admin = ROW_COUNT;

  -- Mezi zbývajícími cizími/sirotčími: stejný slug víckrát → nech první řádek (podle id).
  DELETE FROM public.cards c
  USING (
    SELECT id AS drop_id
    FROM (
      SELECT id,
        row_number() OVER (PARTITION BY card_slug ORDER BY id) AS rn
      FROM public.cards
      WHERE user_id IS DISTINCT FROM admin_id
    ) ranked
    WHERE rn > 1
  ) d
  WHERE c.id = d.drop_id;
  GET DIAGNOSTICS smazano_kolize_mezi_cizimi = ROW_COUNT;

  UPDATE public.cards
  SET user_id = admin_id
  WHERE user_id IS DISTINCT FROM admin_id;
  GET DIAGNOSTICS prirazeno = ROW_COUNT;

  RAISE NOTICE 'Smazáno (kolize s adminem): %', smazano_kolize_admin;
  RAISE NOTICE 'Smazáno (duplicitní slug u cizích): %', smazano_kolize_mezi_cizimi;
  RAISE NOTICE 'Přiřazeno pod admina: %', prirazeno;
  RAISE NOTICE 'Celkem u admina: %', (SELECT count(*) FROM public.cards WHERE user_id = admin_id);
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
