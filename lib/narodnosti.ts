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

/** Aliasy z NHL HUT Builder (`data-card-type-name` / synergy nationality). */
const HUTBUILDER_NARODNOST_ALIASES: Record<string, string> = {
  CANADA: "CA",
  "UNITED STATES": "US",
  USA: "US",
  RUSSIA: "RU",
  FINLAND: "FI",
  SWEDEN: "SE",
  CZECHIA: "CZ",
  "CZECH REPUBLIC": "CZ",
  SLOVAKIA: "SK",
  GERMANY: "DE",
  SWITZERLAND: "CH",
  AUSTRIA: "AT",
  DENMARK: "DK",
  NORWAY: "NO",
  LATVIA: "LV",
  FRANCE: "FR",
  POLAND: "PL",
  "UNITED KINGDOM": "GB",
  "GREAT BRITAIN": "GB",
  SLOVENIA: "SI",
  KAZAKHSTAN: "KZ",
  BELARUS: "BY",
  UKRAINE: "UA",
  ITALY: "IT",
  JAPAN: "JP",
};

let cacheHutbuilderNarodnosti: Map<string, string> | null = null;

function mapaHutbuilderNarodnostiNaKod(): Map<string, string> {
  if (cacheHutbuilderNarodnosti) return cacheHutbuilderNarodnosti;
  const m = new Map<string, string>();
  for (const [alias, code] of Object.entries(HUTBUILDER_NARODNOST_ALIASES)) {
    m.set(alias.toUpperCase(), code);
  }
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: "region") => string[];
    };
    if (typeof intl.supportedValuesOf === "function") {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      for (const code of intl.supportedValuesOf("region")) {
        if (/^\d{3}$/.test(code)) continue;
        const en = dn.of(code);
        if (en) m.set(en.trim().toUpperCase(), code);
      }
    }
  } catch {
    /* ignore */
  }
  cacheHutbuilderNarodnosti = m;
  return m;
}

/** Anglický název z Hut Builder synergy → ISO kód pro `narodnostKod` v bonus kombinaci. */
export function narodnostKodZHutbuilderJmena(name: string): string | null {
  const n = name.trim();
  if (!n) return null;
  return mapaHutbuilderNarodnostiNaKod().get(n.toUpperCase()) ?? null;
}
