-- Přemapuje cards.user_id z cloudu na lokální auth.users podle stejného e-mailu.
--
-- Předpoklad: máš export auth z cloudu (export/hut-builder-auth-data-pg15.sql)
-- a dočasnou tabulku cloud_auth_users (viz remap-cards-user-id-by-email.sh).
--
-- Ručně pro jednoho uživatele:
--   UPDATE public.cards
--   SET user_id = (SELECT id FROM auth.users WHERE lower(email) = lower('tvuj@email.cz'))
--   WHERE user_id = 'UUID-z-cloudu-z-diagnose';

UPDATE public.cards c
SET user_id = nas.id
FROM auth.users nas
INNER JOIN public._cloud_auth_users cloud ON lower(trim(cloud.email)) = lower(trim(nas.email))
WHERE c.user_id = cloud.id
  AND c.user_id IS DISTINCT FROM nas.id;

\echo '=== Po remapu ==='
SELECT user_id, count(*) FROM public.cards GROUP BY 1;
