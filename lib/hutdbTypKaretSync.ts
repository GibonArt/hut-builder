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

/** Jeden řádek pro upsert do `hut_typy_karet_dynamic` z položky Combo Finderu. */
export function enrichDynamicTypZHutbuilder(
  displayName: string,
  comboSoubor: string,
): DynamicTypKartyDbRow {
  const meta = najdiMetaTypuKarty(displayName);
  const hodnota =
    meta?.hodnotaFiltru ??
    displayName.replace(/\s+/g, " ").trim().toUpperCase();
  const k = hodnota.toUpperCase();
  const jeNovy = !statickeFiltryTypuKaret().has(k);
  const jmeno_cs = meta?.jmenoCs ?? (jeNovy ? jmenoCsProNovyHutbuilderTyp(displayName) : displayName.trim());
  const popis_cs =
    meta?.popisCs ??
    (jeNovy
      ? `Nový typ z NHL HUT Builder Combo Finder („${displayName.trim()}“, filtr ${k}).`
      : `Synchronizováno z NHL HUT Builder (${displayName.trim()}).`);

  return {
    hodnota_filtru: k,
    jmeno_cs,
    combo_soubor: comboSoubor.trim(),
    popis_cs,
    aliases: aliasesProTyp(displayName, k, jmeno_cs, comboSoubor),
  };
}

/** Všechny typy z HTML Combo Finderu připravené pro Supabase. */
export function dynamicRadkyZComboFinderHtml(html: string): DynamicTypKartyDbRow[] {
  const parsed = parseCardTypesFromHutbuilderComboFinderHtml(html);
  const out: DynamicTypKartyDbRow[] = [];
  const seen = new Set<string>();
  for (const { logo, displayName } of parsed) {
    const row = enrichDynamicTypZHutbuilder(displayName, logo);
    if (seen.has(row.hodnota_filtru)) continue;
    seen.add(row.hodnota_filtru);
    out.push(row);
  }
  return out;
}

/** Typy z Hut Builderu, které ještě nejsou ve statickém `hutdbTypKaret.ts`. */
export function noveTypyOprotiStatickemuKatalogu(
  radky: readonly DynamicTypKartyDbRow[],
): DynamicTypKartyDbRow[] {
  const staticke = statickeFiltryTypuKaret();
  return radky.filter((r) => !staticke.has(r.hodnota_filtru.trim().toUpperCase()));
}
