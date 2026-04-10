/**
 * Přístup k administraci bonusů — rozšiřitelný seznam e-mailů (lowercase).
 * Server i klient: žádný import z "use client" modulů.
 */
const ADMIN_EMAILS_LOWER = new Set(["gibonart@gmail.com"]);

export function jeBonusAdmin(email: string | null | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  return ADMIN_EMAILS_LOWER.has(e);
}
