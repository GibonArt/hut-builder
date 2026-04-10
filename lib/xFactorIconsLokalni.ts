import type { XFactorUroven } from "@/types";
import manifest from "@/lib/xFactorIconsLokalni.json";

type Řádek = Partial<Record<XFactorUroven, string>>;

const M = manifest as Record<string, Řádek>;

/**
 * Offline ikony z `public/logos/xfactor/` — generuje `npm run xfactor-ikony-urovne` (`.png` / `.avif` / `.webp` dle manifestu).
 */
export function lokalniXFactorUrl(
  klic: string,
  uroven: XFactorUroven,
): string | undefined {
  const soubor = M[klic]?.[uroven];
  return soubor ? `/logos/xfactor/${soubor}` : undefined;
}
