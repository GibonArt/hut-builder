/**
 * Přístup k administraci bonusů, `/admin/*`, `/api/admin/*` a RPC v Supabase —
 * výhradně tento seznam (lowercase). Middleware + stránky + API kontrolují stejně.
 * Pozn.: SQL funkce `admin_prehled_uzivatelu_karet` musí mít shodný e-mail v podmínce.
 */
const ADMIN_EMAILS_LOWER = new Set(["gibonart@gmail.com"]);

export function jeBonusAdmin(email: string | null | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  return ADMIN_EMAILS_LOWER.has(e);
}
