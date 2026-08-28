/**
 * Čitelnější texty k chybám z PostgREST / GoTrue (Supabase) pro zobrazení uživateli.
 */
export function ceskaZpravaAuthNeboDb(raw: string): string {
  const t = raw.trim();
  const n = t.toLowerCase();

  if (n.includes("invalid login") || n.includes("invalid credentials"))
    return "Neplatný e-mail nebo heslo.";
  if (n.includes("email not confirmed") || n.includes("signup_disabled"))
    return "Účet ještě není aktivní — potvrď odkaz v e-mailu.";
  if (n.includes("user already registered") || n.includes("already been registered"))
    return "Tento e-mail je už zaregistrovaný. Zkus se přihlásit.";
  if (n.includes("jwt expired") || n.includes("session"))
    return "Relace vypršela — přihlas se znovu.";
  if (n.includes("network") || n.includes("fetch"))
    return "Chyba připojení. Zkus to znovu za chvíli.";
  if (n.includes("duplicate key") || n.includes("unique constraint"))
    return "Tento záznam už v databázi existuje (duplicita).";
  if (n.includes("permission denied") || n.includes("row-level security"))
    return "Nemáš oprávnění k této akci. Jsi přihlášený?";
  if (n.includes("violates foreign key"))
    return "Nelze uložit — odkazuješ na neexistující údaj.";

  return t;
}
