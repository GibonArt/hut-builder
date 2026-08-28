-- Diagnostika: proč po přihlášení nevidím karty (RLS: auth.uid() = user_id).

\echo '=== Počet karet celkem ==='
SELECT count(*) AS pocet_karet FROM public.cards;

\echo '=== Karty podle user_id (cloud UUID z importu) ==='
SELECT user_id, count(*) AS pocet
FROM public.cards
GROUP BY user_id
ORDER BY pocet DESC;

\echo '=== Uživatelé v auth.users (NAS) ==='
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at;

\echo '=== Shoda: karty, jejich user_id existuje v auth.users? ==='
SELECT
  c.user_id,
  count(*) AS pocet_karet,
  CASE WHEN u.id IS NOT NULL THEN 'ANO' ELSE 'NE — RLS skryje karty' END AS owner_na_nas
FROM public.cards c
LEFT JOIN auth.users u ON u.id = c.user_id
GROUP BY c.user_id, u.id
ORDER BY pocet_karet DESC;
