import {
  hutdbTypyKaretVTriPoradi,
  najdiMetaTypuKarty,
} from "@/lib/hutdbTypKaret";
import type { DynamicTypKartyDbRow } from "@/lib/hutdbTypKaretMerge";

/** HTML z `combo-finder.php` — volby typů karet v builderu. */
export function parseCardTypesFromHutbuilderComboFinderHtml(html: string): {
  logo: string;
  displayName: string;
}[] {
  const byLogo = new Map<string, string>();
  const pairs: [RegExp, "logoFirst" | "nameFirst"][] = [
    [/data-card-type-logo="([^"]+\.(?:png|webp))"[^>]*data-card-type-name="([^"]+)"/gi, "logoFirst"],
    [/data-card-type-name="([^"]+)"[^>]*data-card-type-logo="([^"]+\.(?:png|webp))"/gi, "nameFirst"],
  ];
  for (const [re, order] of pairs) {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(html)) !== null) {
      const logo = order === "logoFirst" ? m[1] : m[2];
      const name = order === "logoFirst" ? m[2] : m[1];
      const nm = name.trim();
      if (logo && nm) byLogo.set(logo, nm);
    }
  }
  return [...byLogo.entries()].map(([logo, displayName]) => ({ logo, displayName }));
}

/**
 * Názvy typů z `<select id="…">` (Chemistry Combos `filter-card`, Cards `card_type_id`).
 * Combo Finder často nemá všechny typy (bez loga) — Chemistry/Cards ano.
 */
export function parseCardTypeNamesFromHutbuilderSelect(
  html: string,
  selectId: string,
): string[] {
  const sel = html.match(
    new RegExp(`<select[^>]*\\sid="${selectId}"[^>]*>[\\s\\S]*?</select>`, "i"),
  );
  if (!sel) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<option[^>]*\svalue="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sel[0])) !== null) {
    const value = m[1]!.trim();
    const label = m[2]!.trim();
    if (!value || !label) continue;
    const key = label.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function metaTypuProHutbuilderDisplayName(displayName: string) {
  const dn = displayName.trim();
  if (!dn) return null;
  return (
    najdiMetaTypuKarty(dn) ??
    (/^HUT\b/i.test(dn) ? null : najdiMetaTypuKarty(`HUT ${dn}`))
  );
}

/** Logo z Combo Finderu, jinak ze statického katalogu (Heroes / Next Gen / Spotlight). */
export function comboSouborProHutbuilderTyp(
  displayName: string,
  logoZComboFinderu: string | null | undefined,
): string {
  const zFinderu = logoZComboFinderu?.trim();
  if (zFinderu) return zFinderu;
  const meta = metaTypuProHutbuilderDisplayName(displayName);
  if (meta?.comboSoubor?.trim()) return meta.comboSoubor.trim();
  const slug = displayName
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 12);
  return `${slug || "MISSING"}0.png`;
}

/** Zkratka z názvu souboru loga (CRO1346245917.png → CRO). */
function zkratkaZComboSouboru(comboSoubor: string): string | null {
  const m = comboSoubor.trim().match(/^([A-Za-z]{2,8})\d/);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Český název pro typ, který v Combo Finderu ještě není ve statickém katalogu.
 * Např. „Crowned“ → „HUT Crowned“ (ve hře / mezi hráči často „HUT Crowned“).
 */
export function jmenoCsProNovyHutbuilderTyp(displayName: string): string {
  const dn = displayName.trim();
  if (!dn) return dn;
  if (/^99X\s/i.test(dn)) return dn;
  if (/^HUT\b/i.test(dn)) return dn;
  const bezPrefixu = new Set([
    "BASE",
    "ICONS",
    "ALUMNI",
    "ROOKIES",
    "MARQUEE",
    "MILESTONES",
    "XP",
    "IGNITED",
    "PINNACLE",
    "PROTOTYPES",
    "SPOTLIGHT",
    "TRANSACTIONS",
  ]);
  if (bezPrefixu.has(dn.replace(/\s+/g, " ").toUpperCase())) return dn;
  if (dn.split(/\s+/).length <= 2) return `HUT ${dn}`;
  return dn;
}

function aliasesProTyp(
  displayName: string,
  hodnotaFiltru: string,
  jmenoCs: string,
  comboSoubor: string,
): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (!t) return;
    const u = t.toUpperCase();
    if (u !== hodnotaFiltru) out.add(u);
  };
  add(displayName);
  add(jmenoCs);
  const zkr = zkratkaZComboSouboru(comboSoubor);
  if (zkr) add(zkr);
  if (jmenoCs.toUpperCase() !== displayName.toUpperCase()) {
    add(displayName.replace(/\s+/g, " "));
  }
  return [...out];
}

export function statickeFiltryTypuKaret(): Set<string> {
  return new Set(
    hutdbTypyKaretVTriPoradi().map((r) => r.hodnotaFiltru.trim().toUpperCase()),
  );
}

/** Jeden řádek pro upsert do `hut_typy_karet_dynamic` z položky Hut Builderu. */
export function enrichDynamicTypZHutbuilder(
  displayName: string,
  comboSoubor: string,
): DynamicTypKartyDbRow {
  const meta = metaTypuProHutbuilderDisplayName(displayName);
  const hodnota =
    meta?.hodnotaFiltru ??
    displayName.replace(/\s+/g, " ").trim().toUpperCase();
  const k = hodnota.toUpperCase();
  const jeNovy = !statickeFiltryTypuKaret().has(k);
  const jmeno_cs = meta?.jmenoCs ?? (jeNovy ? jmenoCsProNovyHutbuilderTyp(displayName) : displayName.trim());
  const popis_cs =
    meta?.popisCs ??
    (jeNovy
      ? `Nový typ z NHL HUT Builder („${displayName.trim()}“, filtr ${k}).`
      : `Synchronizováno z NHL HUT Builder (${displayName.trim()}).`);
  const soubor = comboSouborProHutbuilderTyp(displayName, comboSoubor);

  return {
    hodnota_filtru: k,
    jmeno_cs,
    combo_soubor: soubor,
    popis_cs,
    aliases: aliasesProTyp(displayName, k, jmeno_cs, soubor),
  };
}

/**
 * Sloučí Combo Finder (loga) + Chemistry/Cards select (kompletní názvy).
 * NHL27: Combo Finder má 8 typů, Chemistry Combos 11 (Heroes, Next Gen, Spotlight navíc).
 */
export function dynamicRadkyZHutbuilderTypuKaret(opts: {
  comboFinderHtml: string;
  /** Chemistry Combos nebo jiná stránka s `<select id="filter-card">`. */
  chemistryHtml?: string | null;
  /** Cards.php s `<select id="card_type_id">`. */
  cardsHtml?: string | null;
}): DynamicTypKartyDbRow[] {
  const logoPodleJmena = new Map<string, string>();
  for (const { logo, displayName } of parseCardTypesFromHutbuilderComboFinderHtml(
    opts.comboFinderHtml,
  )) {
    const key = displayName.trim().toUpperCase();
    if (key && logo) logoPodleJmena.set(key, logo);
  }

  const jmena = new Map<string, string>();
  const pridejJmeno = (raw: string) => {
    const nm = raw.trim();
    if (!nm) return;
    const key = nm.toUpperCase();
    if (!jmena.has(key)) jmena.set(key, nm);
  };

  for (const { displayName } of parseCardTypesFromHutbuilderComboFinderHtml(
    opts.comboFinderHtml,
  )) {
    pridejJmeno(displayName);
  }
  if (opts.chemistryHtml) {
    for (const n of parseCardTypeNamesFromHutbuilderSelect(
      opts.chemistryHtml,
      "filter-card",
    )) {
      pridejJmeno(n);
    }
  }
  if (opts.cardsHtml) {
    for (const n of parseCardTypeNamesFromHutbuilderSelect(
      opts.cardsHtml,
      "card_type_id",
    )) {
      pridejJmeno(n);
    }
  }

  const out: DynamicTypKartyDbRow[] = [];
  const seen = new Set<string>();
  for (const displayName of jmena.values()) {
    const logo = logoPodleJmena.get(displayName.trim().toUpperCase()) ?? "";
    const row = enrichDynamicTypZHutbuilder(displayName, logo);
    if (seen.has(row.hodnota_filtru)) continue;
    seen.add(row.hodnota_filtru);
    out.push(row);
  }
  return out;
}

/** Všechny typy z HTML Combo Finderu připravené pro Supabase. */
export function dynamicRadkyZComboFinderHtml(html: string): DynamicTypKartyDbRow[] {
  return dynamicRadkyZHutbuilderTypuKaret({ comboFinderHtml: html });
}

/** Typy z Hut Builderu, které ještě nejsou ve statickém `hutdbTypKaret.ts`. */
export function noveTypyOprotiStatickemuKatalogu(
  radky: readonly DynamicTypKartyDbRow[],
): DynamicTypKartyDbRow[] {
  const staticke = statickeFiltryTypuKaret();
  return radky.filter((r) => !staticke.has(r.hodnota_filtru.trim().toUpperCase()));
}
