-- Volá se z delete-auth-users-by-email.sh (temp tabulka _delete_emails už existuje).

DO $$
DECLARE
  target_ids uuid[];
  n bigint;
BEGIN
  SELECT coalesce(array_agg(u.id), '{}')
  INTO target_ids
  FROM auth.users u
  INNER JOIN _delete_emails d ON lower(trim(u.email)) = d.email;

  IF array_length(target_ids, 1) IS NULL THEN
    RAISE NOTICE 'Žádný účet v auth.users neodpovídá zadaným e-mailům.';
    RETURN;
  END IF;

  DELETE FROM auth.sessions WHERE user_id = ANY (target_ids);
  DELETE FROM auth.refresh_tokens WHERE user_id = ANY (target_ids);
  DELETE FROM auth.mfa_factors WHERE user_id = ANY (target_ids);
  DELETE FROM auth.one_time_tokens WHERE user_id = ANY (target_ids);
  DELETE FROM auth.identities WHERE user_id = ANY (target_ids);
  DELETE FROM auth.users WHERE id = ANY (target_ids);

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Smazáno % účtů.', n;
END $$;

\echo '=== Zbývající účty (zadané e-maily by měly chybět) ==='
SELECT u.email
FROM auth.users u
INNER JOIN _delete_emails d ON lower(trim(u.email)) = d.email;
