-- Po remapu: proč Přehled uživatelů ukazuje nuly?

\echo '=== Karet celkem ==='
SELECT count(*) AS pocet_karet FROM public.cards;

\echo '=== Karet navázaných na auth.users (NAS) ==='
SELECT count(*) AS navazane
FROM public.cards c
INNER JOIN auth.users u ON u.id = c.user_id;

\echo '=== Karet sirotčích (user_id není v auth.users) ==='
SELECT count(*) AS sirotci
FROM public.cards c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE u.id IS NULL;

\echo '=== Top 10 user_id v cards (po remapu) ==='
SELECT c.user_id, u.email AS nas_email, count(*) AS pocet
FROM public.cards c
LEFT JOIN auth.users u ON u.id = c.user_id
GROUP BY c.user_id, u.email
ORDER BY pocet DESC
LIMIT 10;

\echo '=== Přehled: NAS uživatelé s počtem karet (jako admin RPC) ==='
SELECT u.email, count(c.id) AS pocet_karet
FROM auth.users u
LEFT JOIN public.cards c ON c.user_id = u.id
GROUP BY u.id, u.email
HAVING count(c.id) > 0
ORDER BY pocet_karet DESC
LIMIT 20;

\echo '=== NAS uživatelé s karetami = 0 (jen počet) ==='
SELECT count(*) AS uzivatelu_bez_karet
FROM auth.users u
LEFT JOIN public.cards c ON c.user_id = u.id
GROUP BY u.id
HAVING count(c.id) = 0;
