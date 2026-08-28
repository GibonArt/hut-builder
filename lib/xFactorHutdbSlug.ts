/**
 * Slug pro PNG ability na hutdb.app: `NHL_26_{slug}_X-Factor_Image__{Bronze|Silver|Gold}__File.png`
 * (ověřeno proti https://www.hutdb.app/abilities/ — 2026).
 */

function normKlíč(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''']/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Výjimky: automatická Title_Case z anglického názvu občas neodpovídá názvu souboru na HUTDB.
 * Klíč = `normKlíč(labelEn)` z katalogu.
 */
const SLUG_OVERRIDE: Record<string, string> = {
  [normKlíč("Pressure")]: "PressurePlus",
  [normKlíč("Pressure+")]: "PressurePlus",
  [normKlíč("PRESSURE+")]: "PressurePlus",
  [normKlíč("Quick Pick")]: "Quickpick",
};

/**
 * Anglický název ability (jako v katalogu / EA) → segment `slug` v URL hutdb.
 */
export function hutdbSlugZLabelEn(labelEn: string): string {
  const o = SLUG_OVERRIDE[normKlíč(labelEn)];
  if (o) return o;
  const cleaned = labelEn
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''']/g, "")
    .trim();
  const parts = cleaned.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("_");
}
