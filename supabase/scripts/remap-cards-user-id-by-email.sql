-- Přemapuje cards.user_id z cloudu na lokální auth.users podle stejného e-mailu.
--
-- Předpoklad: máš export auth z cloudu (export/hut-builder-auth-data-pg15.sql)
-- a dočasnou tabulku _cloud_auth_users (viz remap-cards-user-id-by-email.sh).
--
-- Remap funguje jen když stejný e-mail existuje v auth.users na NAS i v cloud exportu.

\echo '=== E-mail shody cloud ↔ NAS (kolik párů lze mapovat) ==='
SELECT count(*) AS paru_email
FROM public._cloud_auth_users cloud
INNER JOIN auth.users nas ON lower(trim(cloud.email)) = lower(trim(nas.email));

\echo '=== Karet s user_id z cloudu (před UPDATE) ==='
SELECT count(*) AS karet_k_remapu
FROM public.cards c
INNER JOIN public._cloud_auth_users cloud ON c.user_id = cloud.id;

\echo '=== Remap UPDATE ==='
WITH updated AS (
  UPDATE public.cards c
  SET user_id = nas.id
  FROM auth.users nas
  INNER JOIN public._cloud_auth_users cloud ON lower(trim(cloud.email)) = lower(trim(nas.email))
  WHERE c.user_id = cloud.id
    AND c.user_id IS DISTINCT FROM nas.id
  RETURNING c.id
)
SELECT count(*) AS remapovano_radku FROM updated;

\echo '=== Po remapu: karet navázaných / sirotčích ==='
SELECT
  count(*) FILTER (WHERE u.id IS NOT NULL) AS navazane,
  count(*) FILTER (WHERE u.id IS NULL) AS sirotci
FROM public.cards c
LEFT JOIN auth.users u ON u.id = c.user_id;

\echo '=== Po remapu: top user_id v cards ==='
SELECT c.user_id, u.email, count(*) AS pocet
FROM public.cards c
LEFT JOIN auth.users u ON u.id = c.user_id
GROUP BY c.user_id, u.email
ORDER BY pocet DESC
LIMIT 10;
