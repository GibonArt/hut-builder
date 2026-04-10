import type { Liga } from "@/types";
import manifestRaw from "@/lib/tymLogaManifest.json";

/** Relativní cesta pod public/logos/{liga}/ — hodnota z tymLogaManifest.json (generuje scripts/stahni-tym-loga.mjs). */
type Manifest = Partial<Record<Liga, Record<string, string>>>;

const RAW = manifestRaw as Manifest;

/** Klíče týmů i po NFC (shoda s UI / ukládáním). */
const MANIFEST: Manifest = (() => {
  const m: Manifest = {};
  for (const liga of Object.keys(RAW) as (keyof Manifest)[]) {
    const teams = RAW[liga];
    if (!teams) continue;
    m[liga] = { ...teams };
    for (const [k, v] of Object.entries(teams)) {
      const n = k.normalize("NFC");
      if (n !== k) m[liga]![n] = v;
    }
  }
  return m;
})();

/**
 * URL loga — výhradně lokální soubory v public/logos/{liga}/ (npm run loga).
 * null = tým bez záznamu v manifestu → iniciály.
 */
export function urlLogaTymu(tym: string, liga: Liga): string | null {
  if (!tym) return null;
  const k = tym.normalize("NFC");
  const tab = MANIFEST[liga];
  const file = tab?.[tym] ?? tab?.[k];
  return file ? `/logos/${liga}/${file}` : null;
}

export function iniciályTymu(nazev: string): string {
  const parts = nazev.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
