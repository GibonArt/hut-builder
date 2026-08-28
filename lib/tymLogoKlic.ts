/**
 * Název souboru loga z kanonického názvu týmu (stejný řetězec jako v UI / tymyPodleLigy).
 * Konvence vhodná pro i18n: Unicode NFC, malá písmena, oddělovač pomlčka, bez lomítek.
 */
export function tymLogoSouborKlíč(nazev: string): string {
  const s = nazev.normalize("NFC").trim().toLowerCase();
  const slug = s
    .replace(/\//g, "-")
    .replace(/[^0-9\p{L}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tym";
}
