/**
 * Seznam národností pro UI: kódy ISO 3166-1 alpha-2 + lokalizované názvy (cs-CZ)
 * z Intl.DisplayNames — data vycházejí z CLDR / mezinárodních standardů dostupných v runtime.
 */

export type NarodnostVolba = {
  /** ISO 3166-1 alpha-2 (např. CZ, CA) */
  code: string;
  /** Název státu v češtině */
  label: string;
};

/** Záloha pro prostředí bez Intl.supportedValuesOf (starší runtime). */
const ZALOHA_HOKEJ: NarodnostVolba[] = [
  { code: "CZ", label: "Česko" },
  { code: "SK", label: "Slovensko" },
  { code: "CA", label: "Kanada" },
  { code: "US", label: "Spojené státy americké" },
  { code: "SE", label: "Švédsko" },
  { code: "FI", label: "Finsko" },
  { code: "RU", label: "Rusko" },
  { code: "CH", label: "Švýcarsko" },
  { code: "DE", label: "Německo" },
  { code: "AT", label: "Rakousko" },
  { code: "NO", label: "Norsko" },
  { code: "DK", label: "Dánsko" },
  { code: "LV", label: "Lotyšsko" },
  { code: "FR", label: "Francie" },
  { code: "PL", label: "Polsko" },
  { code: "GB", label: "Spojené království" },
  { code: "SI", label: "Slovinsko" },
  { code: "KZ", label: "Kazachstán" },
  { code: "BY", label: "Bělorusko" },
  { code: "UA", label: "Ukrajina" },
].sort((a, b) => a.label.localeCompare(b.label, "cs", { sensitivity: "base" }));

let cache: NarodnostVolba[] | null = null;

function sestavZeIntl(): NarodnostVolba[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: "region") => string[];
  };
  if (typeof intl.supportedValuesOf !== "function") {
    return ZALOHA_HOKEJ;
  }

  try {
    const dn = new Intl.DisplayNames(["cs-CZ"], { type: "region" });
    const codes = intl.supportedValuesOf("region");
    const out: NarodnostVolba[] = [];

    for (const code of codes) {
      if (/^\d{3}$/.test(code)) continue;
      const label = dn.of(code);
      if (!label) continue;
      out.push({ code, label });
    }

    out.sort((a, b) =>
      a.label.localeCompare(b.label, "cs", { sensitivity: "base" }),
    );
    return out;
  } catch {
    /* Node / některá prostředí nemají plnou podporu region pro supportedValuesOf */
    return ZALOHA_HOKEJ;
  }
}

/** Všechny dostupné národnosti (státy) seřazené podle českého názvu. */
export function vsechnyNarodnostiCS(): NarodnostVolba[] {
  if (!cache) {
    cache = sestavZeIntl();
  }
  return cache;
}

/**
 * Vlajka z ISO 3166-1 alpha-2 (regionální indikátory Unicode).
 * Neplatný kód → 🏳️.
 */
export function vlajkaZeme(isoAlpha2: string): string {
  const c = isoAlpha2.trim().toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "\u{1F3F3}\uFE0F";
  const base = 0x1f1e6;
  const a = c.charCodeAt(0)! - 65;
  const b = c.charCodeAt(1)! - 65;
  if (a < 0 || a > 25 || b < 0 || b > 25) return "\u{1F3F3}\uFE0F";
  return String.fromCodePoint(base + a, base + b);
}

/** ISO kód podle českého názvu ze seznamu voleb (pro zobrazení uložené karty). */
export function kodNarodnostiPodleLabelu(
  label: string,
  volby: readonly NarodnostVolba[],
): string | null {
  const n = label.trim();
  if (!n) return null;
  const hit = volby.find((v) => v.label === n);
  return hit?.code ?? null;
}
