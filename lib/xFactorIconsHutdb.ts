/**
 * Ikony z hutdb.app — `abilities/NHL_26_{slug}_X-Factor_Image__{Bronze|Silver|Gold}__File.png`.
 * Slug z `lib/xFactorHutdbSlug.ts` (ověřeno proti veřejným PNG na Netlify).
 */

import { hutdbSlugZLabelEn } from "@/lib/xFactorHutdbSlug";
import type { XFactorUroven } from "@/types";

const HUTDB_BASE = "https://www.hutdb.app/abilities/";

const HUTDB_TIER: Record<XFactorUroven, "Bronze" | "Silver" | "Gold"> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

export function hutdbAbilityImageUrl(slug: string, uroven: XFactorUroven): string {
  const t = HUTDB_TIER[uroven];
  return `${HUTDB_BASE}NHL_26_${slug}_X-Factor_Image__${t}__File.png`;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function hutdbIconUrlProEaJmenoAUroven(
  jmeno: string,
  uroven: XFactorUroven,
): string {
  const slug = hutdbSlugZLabelEn(jmeno);
  return hutdbAbilityImageUrl(slug, uroven);
}

/** Výchozí zlatá varianta (kompatibilita). */
export function hutdbIconUrlProEaJmeno(jmeno: string): string {
  return hutdbIconUrlProEaJmenoAUroven(jmeno, "gold");
}

export function hutdbIconUrlProEaShodyAUroven(
  eaShody: readonly string[],
  uroven: XFactorUroven,
): string | undefined {
  const s = eaShody.find((x) => x.trim());
  if (!s) return undefined;
  return hutdbIconUrlProEaJmenoAUroven(s, uroven);
}

export function hutdbIconUrlProEaShody(
  eaShody: readonly string[],
): string | undefined {
  return hutdbIconUrlProEaShodyAUroven(eaShody, "gold");
}
