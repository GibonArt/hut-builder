/**
 * Přístup k administraci bonusů a admin stránkám (přehled uživatelů) —
 * rozšiřitelný seznam e-mailů (lowercase).
 * Server i klient: žádný import z "use client" modulů.
 * Pozn.: RPC `admin_prehled_uzivatelu_karet` v Supabase kontroluje stejný e-mail v SQL.
 */
const ADMIN_EMAILS_LOWER = new Set(["gibonart@gmail.com"]);

export function jeBonusAdmin(email: string | null | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  return ADMIN_EMAILS_LOWER.has(e);
}
