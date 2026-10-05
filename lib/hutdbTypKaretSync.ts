import {
  hutdbTypyKaretVTriPoradi,
  najdiMetaTypuKarty,
} from "@/lib/hutdbTypKaret";
import type { DynamicTypKartyDbRow } from "@/lib/hutdbTypKaretMerge";

/** HTML z `combo-finder.php` — volby typů karet v builderu (legacy data-card-type-* atributy). */
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
      if (logo && nm) byLogo.set(logoSouborZCesty(logo), nm);
    }
  }
  return [...byLogo.entries()].map(([logo, displayName]) => ({ logo, displayName }));
}

/** Nový Chemistry Combos markup — title + card_logos z řádků. */
export function parseCardTypesFromChemistryCombosHtml(html: string): {
  logo: string;
  displayName: string;
}[] {
  const byKey = new Map<string, { displayName: string; logo: string }>();
  const re =
    /combo_selector card"[^>]*title="([^"]+)"[^>]*>\s*<img[^>]+src="(?:images\/card_logos\/)?([^"]+\.(?:png|webp))"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const displayName = m[1]!.trim();
    const logo = logoSouborZCesty(m[2]!);
    if (!displayName) continue;
    byKey.set(displayName.toUpperCase(), { displayName, logo });
  }
  return [...byKey.values()];
}

function logoSouborZCesty(logo: string): string {
  const t = logo.trim().replace(/\\/g, "/");
  const i = t.lastIndexOf("/");
  return i >= 0 ? t.slice(i + 1) : t;
}

export type HutbuilderSelectListCardType = {
  id: string;
  name: string;
  abbr?: string;
  logo?: string;
};

/** Odpověď `ajax/select-list.php?type=card_type` (NHL27 UI). */
export function parseCardTypesFromSelectListJson(raw: unknown): {
  logo: string;
  displayName: string;
  abbr?: string;
}[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as { status?: string; items?: unknown };
  if (o.status && o.status !== "success") return [];
  if (!Array.isArray(o.items)) return [];
  const out: { logo: string; displayName: string; abbr?: string }[] = [];
  for (const item of o.items) {
    if (!item || typeof item !== "object") continue;
    const it = item as HutbuilderSelectListCardType;
    const name = String(it.name ?? "").trim();
    if (!name) continue;
    out.push({
      displayName: name,
      logo: logoSouborZCesty(String(it.logo ?? "")),
      abbr: it.abbr ? String(it.abbr).trim() : undefined,
    });
  }
  return out;
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
  const zFinderu = logoSouborZCesty(logoZComboFinderu?.trim() ?? "");
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
 * Sloučí Combo Finder (loga) + Chemistry/Cards select + AJAX select-list (NHL27).
 */
export function dynamicRadkyZHutbuilderTypuKaret(opts: {
  comboFinderHtml?: string | null;
  /** Chemistry Combos nebo jiná stránka s `<select id="filter-card">` / novými card logy. */
  chemistryHtml?: string | null;
  /** Cards.php s `<select id="card_type_id">`. */
  cardsHtml?: string | null;
  /** Položky z `ajax/select-list.php?type=card_type`. */
  selectListItems?: readonly {
    logo: string;
    displayName: string;
    abbr?: string;
  }[] | null;
}): DynamicTypKartyDbRow[] {
  const logoPodleJmena = new Map<string, string>();
  const abbrPodleJmena = new Map<string, string>();
  const jmena = new Map<string, string>();

  const pridejLogo = (displayName: string, logo: string) => {
    const key = displayName.trim().toUpperCase();
    const soubor = logoSouborZCesty(logo);
    if (key && soubor) logoPodleJmena.set(key, soubor);
  };
  const pridejJmeno = (raw: string) => {
    const nm = raw.trim();
    if (!nm) return;
    const key = nm.toUpperCase();
    if (!jmena.has(key)) jmena.set(key, nm);
  };

  if (opts.comboFinderHtml) {
    for (const { logo, displayName } of parseCardTypesFromHutbuilderComboFinderHtml(
      opts.comboFinderHtml,
    )) {
      pridejJmeno(displayName);
      pridejLogo(displayName, logo);
    }
  }
  if (opts.chemistryHtml) {
    for (const n of parseCardTypeNamesFromHutbuilderSelect(
      opts.chemistryHtml,
      "filter-card",
    )) {
      pridejJmeno(n);
    }
    for (const { logo, displayName } of parseCardTypesFromChemistryCombosHtml(
      opts.chemistryHtml,
    )) {
      pridejJmeno(displayName);
      pridejLogo(displayName, logo);
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
  if (opts.selectListItems) {
    for (const it of opts.selectListItems) {
      pridejJmeno(it.displayName);
      if (it.logo) pridejLogo(it.displayName, it.logo);
      if (it.abbr?.trim()) {
        abbrPodleJmena.set(it.displayName.trim().toUpperCase(), it.abbr.trim());
      }
    }
  }

  const out: DynamicTypKartyDbRow[] = [];
  const seen = new Set<string>();
  for (const displayName of jmena.values()) {
    const logo = logoPodleJmena.get(displayName.trim().toUpperCase()) ?? "";
    const row = enrichDynamicTypZHutbuilder(displayName, logo);
    const abbr = abbrPodleJmena.get(displayName.trim().toUpperCase());
    if (abbr) {
      const aliases = [...(row.aliases ?? [])];
      if (!aliases.includes(abbr.toUpperCase())) {
        aliases.push(abbr.toUpperCase());
        row.aliases = aliases;
      }
    }
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

export async function stahniHutbuilderSelectListCardTypes(
  selectListUrl: string,
  referer: string,
  timeoutMs = 30_000,
): Promise<{ logo: string; displayName: string; abbr?: string }[]> {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
  const url = `${selectListUrl}?type=card_type&filters=${encodeURIComponent("{}")}`;
  const res = await fetch(url, {
    ...(signal ? { signal } : {}),
    headers: {
      "User-Agent": "HUT-App/1.0 (select-list card types)",
      Referer: referer,
      Accept: "application/json,text/plain,*/*",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Hut Builder select-list HTTP ${res.status}`);
  }
  const raw: unknown = await res.json();
  return parseCardTypesFromSelectListJson(raw);
}

/** Typy z Hut Builderu, které ještě nejsou ve statickém `hutdbTypKaret.ts`. */
export function noveTypyOprotiStatickemuKatalogu(
  radky: readonly DynamicTypKartyDbRow[],
): DynamicTypKartyDbRow[] {
  const staticke = statickeFiltryTypuKaret();
  return radky.filter((r) => !staticke.has(r.hodnota_filtru.trim().toUpperCase()));
}
