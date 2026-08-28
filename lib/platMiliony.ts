/**
 * Plat na kartách: uvnitř `HutCard.plat` je vždy celá částka (jako ve hře).
 * Formulář a štítky pracují s miliony (1,5 → 1_500_000).
 */

/** Převede text z pole „Plat (mil.)“ na absolutní částku, nebo `null` při chybě. */
export function parsePlatVstupVMilionech(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const mil = Number.parseFloat(s);
  if (Number.isNaN(mil) || mil < 0) return null;
  return Math.round(mil * 1_000_000);
}

/** Zobrazí např. „1,5 MIL“ (cs-CZ, max. 2 desetinná místa). */
export function formatovatPlatVMil(platAbsolutni: number): string {
  const mil = platAbsolutni / 1_000_000;
  const txt = mil.toLocaleString("cs-CZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${txt} MIL`;
}
