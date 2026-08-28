import { jeBonusAdmin } from "@/lib/bonusAdmin";

/** Soukromý režim HUT — jen e-maily z `jeBonusAdmin` (viz lib/bonusAdmin.ts). Turnaj účty v DB zůstanou. */
export function hutJeSoukromyAdminOnly(): boolean {
  const v = process.env.HUT_PRIVATE_ADMIN_ONLY?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function hutJeVerejnaAuthCesta(path: string): boolean {
  if (path === "/login" || path === "/obnova-hesla") return true;
  if (path.startsWith("/auth/")) return true;
  return false;
}

export function hutMaPristup(email: string | null | undefined): boolean {
  if (!hutJeSoukromyAdminOnly()) return true;
  return jeBonusAdmin(email);
}
