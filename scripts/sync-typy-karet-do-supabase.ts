/**
 * Krok 1 — synchronizace typů karet z Hut Builderu do Supabase.
 * Stejná logika jako POST /api/admin/sync-typy-karet (bez prohlížeče).
 *
 * Combo Finder (loga) + Chemistry Combos (kompletní seznam typů).
 *
 * Vyžaduje v .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * NHL27: NEXT_PUBLIC_SUPABASE_NHL27_URL, SUPABASE_NHL27_SERVICE_ROLE_KEY
 *
 * npm run sync:typy-karet
 * npm run sync:typy-karet -- --sezona=nhl27
 */
import { upsertDynamickeTypyKaret } from "@/lib/hutdbTypKaretDynamicDb";
import {
  dynamicRadkyZHutbuilderTypuKaret,
  noveTypyOprotiStatickemuKatalogu,
} from "@/lib/hutdbTypKaretSync";
import { hutbuilderConfigProSezonu } from "@/lib/hutbuilderSezonaConfig";
import { labelSezony, parseSezonaZArgv } from "@/lib/sezona";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";
import { dataSupabaseEnv } from "@/lib/supabase/env";

async function stahni(url: string, referer: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "HUT-App/1.0 (NAS sync card types)",
      Referer: referer,
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
    throw new Error(`Hut Builder HTTP ${res.status} (${url})`);
  }
  return res.text();
}

async function main() {
  const sezona = parseSezonaZArgv(process.argv.slice(2));
  const cfg = hutbuilderConfigProSezonu(sezona);
  process.stderr.write(
    `Sezóna ${labelSezony(sezona)} — stahuji Combo Finder + Chemistry Combos…\n`,
  );

  const [comboHtml, chemHtml] = await Promise.all([
    stahni(cfg.comboFinderUrl, cfg.comboFinderReferer),
    stahni(cfg.chemistryCombosUrl, cfg.chemistryCombosReferer).catch((e) => {
      process.stderr.write(
        `Varování: Chemistry Combos nedostupné (${String(e)}); použiji jen Combo Finder.\n`,
      );
      return null as string | null;
    }),
  ]);

  const rows = dynamicRadkyZHutbuilderTypuKaret({
    comboFinderHtml: comboHtml,
    chemistryHtml: chemHtml,
  });
  if (rows.length === 0) {
    console.error("V HTML se nepodařilo najít žádný typ karet.");
    process.exit(1);
  }

  const supabase = createSupabaseServiceClient(sezona);
  const env = dataSupabaseEnv(sezona);
  try {
    const u = new URL(env.url);
    process.stderr.write(`Supabase: ${u.protocol}//${u.hostname}\n`);
  } catch {
    /* ignore */
  }

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
    `\nHotovo (${sezona}): ${rows.length} typů, nových v DB: ${novychVDb}, aktualizováno: ${rows.length - novychVDb}\n`,
  );
  process.stderr.write(
    `Typy: ${rows.map((r) => r.jmeno_cs).join(", ")}\n`,
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
