import type { HutDbTypKarty } from "@/lib/hutdbTypKaret";

export type DynamicTypKartyDbRow = {
  hodnota_filtru: string;
  jmeno_cs: string;
  combo_soubor: string;
  popis_cs?: string | null;
  aliases?: string[] | null;
};

function zkratkaZComboSouboru(comboSoubor: string): string | null {
  const m = comboSoubor.trim().match(/^([A-Za-z]{2,8})\d/);
  return m ? m[1].toUpperCase() : null;
}

/** Aliasy z DB, nebo odhad z jmeno_cs / combo_soubor (když PostgREST neumí sloupec aliases). */
export function efektivniAliasesDynamickehoRadku(d: DynamicTypKartyDbRow): string[] {
  if (d.aliases?.length) {
    return d.aliases.map((a) => String(a ?? "").trim()).filter(Boolean);
  }
  const canonical = d.hodnota_filtru.trim().toUpperCase();
  const out = new Set<string>();
  const add = (s: string) => {
    const u = s.trim().toUpperCase();
    if (u && u !== canonical) out.add(u);
  };
  add(d.jmeno_cs);
  const zkr = zkratkaZComboSouboru(d.combo_soubor);
  if (zkr) add(zkr);
  const bezHut = d.jmeno_cs.replace(/^HUT\s+/i, "").trim();
  if (bezHut) {
    add(bezHut);
    add(`HUT ${bezHut}`);
  }
  return [...out];
}

/** Alias (uppercase) → kanonická hodnota_filtru (uppercase). */
export function aliasMapZDynamickychRadku(
  dynamic: readonly DynamicTypKartyDbRow[] | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of dynamic ?? []) {
    const canonical = d.hodnota_filtru.trim().toUpperCase();
    if (!canonical) continue;
    for (const raw of efektivniAliasesDynamickehoRadku(d)) {
      const a = raw.trim().toUpperCase();
      if (a && a !== canonical) out[a] = canonical;
    }
  }
  return out;
}

/**
 * Sloučí statický katalog z kódu s řádky z Supabase (`hut_typy_karet_dynamic`).
 * Dynamické řádky přepíší `comboSoubor` / `jmenoCs` u shodného `hodnotaFiltru`;
 * úplně nové filtry se přidají na konec (řazení volá volající).
 */
export function sloucitStaticADynamickeTypy(
  staticRadky: readonly HutDbTypKarty[],
  dynamic: readonly DynamicTypKartyDbRow[] | null | undefined,
): HutDbTypKarty[] {
  const dynMap = new Map<string, DynamicTypKartyDbRow>();
  for (const d of dynamic ?? []) {
    const k = d.hodnota_filtru.trim().toUpperCase();
    if (!k) continue;
    dynMap.set(k, { ...d, hodnota_filtru: k });
  }

  const seenDyn = new Set<string>();
  const out: HutDbTypKarty[] = [];

  for (const r of staticRadky) {
    const k = r.hodnotaFiltru.toUpperCase();
    seenDyn.add(k);
    const d = dynMap.get(k);
    if (d) {
      out.push({
        ...r,
        comboSoubor: d.combo_soubor?.trim() ? d.combo_soubor.trim() : r.comboSoubor,
        jmenoCs: d.jmeno_cs?.trim() ? d.jmeno_cs.trim() : r.jmenoCs,
        popisCs: d.popis_cs?.trim() ? d.popis_cs.trim() : r.popisCs,
      });
    } else {
      out.push(r);
    }
  }

  for (const d of dynMap.values()) {
    const k = d.hodnota_filtru.toUpperCase();
    if (seenDyn.has(k)) continue;
    seenDyn.add(k);
    const soubor = d.combo_soubor.trim();
    if (!soubor) continue;
    out.push({
      hodnotaFiltru: k,
      jmenoCs: d.jmeno_cs.trim() || k,
      popisCs: d.popis_cs?.trim() || "Synchronizováno z NHL HUT Builder.",
      comboSoubor: soubor,
    });
  }

  return out;
}
