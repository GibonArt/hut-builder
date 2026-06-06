/**
 * Krok 1 — synchronizace typů karet z Combo Finderu do Supabase.
 * Stejná logika jako POST /api/admin/sync-typy-karet (bez prohlížeče).
 *
 * Vyžaduje v .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * npm run sync:typy-karet
 */
import { upsertDynamickeTypyKaret } from "@/lib/hutdbTypKaretDynamicDb";
import {
  dynamicRadkyZComboFinderHtml,
  noveTypyOprotiStatickemuKatalogu,
} from "@/lib/hutdbTypKaretSync";
import { HUTBUILDER_COMBO_FINDER_REFERER } from "@/lib/hutbuilderGetLines";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";

const COMBO_FINDER = "https://nhlhutbuilder.com/combo-finder.php";

async function main() {
  process.stderr.write("Stahuji combo-finder.php…\n");
  const res = await fetch(COMBO_FINDER, {
    headers: {
      "User-Agent": "HUT-App/1.0 (NAS sync card types; combo-finder)",
      Referer: HUTBUILDER_COMBO_FINDER_REFERER,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
    signal:
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(55_000)
        : undefined,
  });
  if (!res.ok) {
    console.error(`Hut Builder HTTP ${res.status}`);
    process.exit(1);
  }
  const html = await res.text();
  const rows = dynamicRadkyZComboFinderHtml(html);
  if (rows.length === 0) {
    console.error("V HTML se nepodařilo najít žádný typ karet.");
    process.exit(1);
  }

  const supabase = createSupabaseServiceClient();
  const { data: existujiciRadky, error: chybaExistujicich } = await supabase
    .from("hut_typy_karet_dynamic")
    .select("hodnota_filtru");
  if (chybaExistujicich) {
    console.error(chybaExistujicich.message);
    process.exit(1);
  }
  const existujiciKlice = new Set(
    (existujiciRadky ?? []).map((r) =>
      String((r as { hodnota_filtru?: string }).hodnota_filtru ?? "")
        .trim()
        .toUpperCase(),
    ),
  );
  let novychVDb = 0;
  for (const r of rows) {
    const k = r.hodnota_filtru.trim().toUpperCase();
    if (!existujiciKlice.has(k)) novychVDb += 1;
  }

  const syncedAt = new Date().toISOString();
  const { error, schema_varovani } = await upsertDynamickeTypyKaret(supabase, rows, syncedAt);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (schema_varovani) {
    process.stderr.write(`\nVarování: ${schema_varovani}\n`);
  }

  const nove = noveTypyOprotiStatickemuKatalogu(rows);
  process.stderr.write(
    `\nHotovo: ${rows.length} typů, nových v DB: ${novychVDb}, aktualizováno: ${rows.length - novychVDb}\n`,
  );
  if (nove.length > 0) {
    process.stderr.write(
      `Nové v dropdownu (mimo statický kód): ${nove.map((r) => r.jmeno_cs).join(", ")}\n`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
