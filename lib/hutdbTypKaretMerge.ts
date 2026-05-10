import type { HutDbTypKarty } from "@/lib/hutdbTypKaret";

export type DynamicTypKartyDbRow = {
  hodnota_filtru: string;
  jmeno_cs: string;
  combo_soubor: string;
};

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
      popisCs: "Synchronizováno z NHL HUT Builder.",
      comboSoubor: soubor,
    });
  }

  return out;
}
