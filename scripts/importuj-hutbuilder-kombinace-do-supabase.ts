/**
 * Krok 2 — import kombinací z Hut Builderu do Supabase (bonus_kombinace_global).
 * Výchozí zdroj: Chemistry Combos (stejné jako nhlhutbuilder.com/chemistry-combos.php).
 *
 * Vyžaduje v .env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Volitelně: HUT_IMPORT_EDITOR_USER_ID (UUID admina pro updated_by)
 *
 * npm run import:hutbuilder-kombinace
 * npm run import:hutbuilder-kombinace -- --nahradit
 * npm run import:hutbuilder-kombinace -- --zdroj=combo-finder
 * npm run import:hutbuilder-kombinace -- --jen-stahnout --out=data/hutbuilder-import-cache.json
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import {
  deduplikujPayloadBonusu,
  deduplikujRadkyBonusu,
  nactiBonusKombinaceSdilene,
  ulozBonusKombinaciSdilenou,
  type RadekBonusKombinaceUi,
} from "@/lib/bonusKombinaceDb";
import { stahniKombinaceZChemistryCombos } from "@/lib/hutbuilderChemistryCombosHtml";
import { stahniKombinaceZHutbuilder, VYCHOZI_PRUCHODY_IMPORTU } from "@/lib/hutbuilderImportKombinaceRun";
import {
  createSupabaseServiceClient,
  editorUserIdZSupabase,
} from "@/lib/supabaseServiceClient";

type ZdrojImportu = "chemistry" | "combo-finder";

function parseArgs(argv: string[]) {
  let jenStahnout = false;
  let nahradit = false;
  let zdroj: ZdrojImportu = "chemistry";
  let outPath = "";
  let delayMs = 280;
  let timeoutMs = 240_000;
  for (const a of argv) {
    if (a === "--jen-stahnout") jenStahnout = true;
    else if (a === "--nahradit") nahradit = true;
    else if (a === "--zdroj=combo-finder") zdroj = "combo-finder";
    else if (a === "--zdroj=chemistry") zdroj = "chemistry";
    else if (a.startsWith("--out=")) outPath = a.slice("--out=".length).trim();
    else if (a.startsWith("--delay=")) {
      delayMs = Math.max(0, Number(a.slice("--delay=".length)) || 280);
    } else if (a.startsWith("--timeout=")) {
      timeoutMs = Math.max(30_000, Number(a.slice("--timeout=".length)) || 240_000);
    }
  }
  if (zdroj === "chemistry") nahradit = true;
  return { jenStahnout, nahradit, zdroj, outPath, delayMs, timeoutMs };
}

async function main() {
  const { jenStahnout, nahradit, zdroj, outPath, delayMs, timeoutMs } = parseArgs(
    process.argv.slice(2),
  );

  const onLog = (msg: string) => process.stderr.write(`${msg}\n`);

  let noveUt: RadekBonusKombinaceUi[] = [];
  let noveOb: RadekBonusKombinaceUi[] = [];
  let meta: Record<string, unknown> = { zdroj };

  if (zdroj === "chemistry") {
    onLog("Stahuji Chemistry Combos z nhlhutbuilder.com…");
    const parsed = await stahniKombinaceZChemistryCombos(55_000);
    noveUt = parsed.utocna;
    noveOb = parsed.obranna;
    meta = {
      ...meta,
      stazeno_v: parsed.stazeno_v,
      preskoceno_radku: parsed.preskocenoRadku,
    };
    onLog(
      `Staženo Chemistry Combos: útok ${noveUt.length}, obrana ${noveOb.length}` +
        (parsed.preskocenoRadku ? `, přeskočeno ${parsed.preskocenoRadku}` : ""),
    );
  } else {
    onLog(
      `Začínám Combo Finder (get_lines.php, timeout ${Math.round(timeoutMs / 1000)} s na pokus)…`,
    );
    const stazeno = await stahniKombinaceZHutbuilder({
      delayMs,
      onLog,
      presProxy: false,
      pruchody: VYCHOZI_PRUCHODY_IMPORTU.map((p) => ({ ...p, timeoutMs })),
    });
    noveUt = stazeno.noveUt;
    noveOb = stazeno.noveOb;
    meta = {
      ...meta,
      stazenych_stranek: stazeno.stazenychStranek,
      unikatnich_line_id: stazeno.unikatnichLineId,
    };
    onLog(
      `Staženo Combo Finder: ${stazeno.stazenychStranek} stránek, ${stazeno.unikatnichLineId} line_id, útok ${noveUt.length}, obrana ${noveOb.length}`,
    );
    if (noveUt.length < 200) {
      onLog(
        "Varování: Combo Finder vrátil málo útočných řádků — doporučujeme výchozí --zdroj=chemistry.",
      );
    }
  }

  if (jenStahnout) {
    const file =
      outPath ||
      join(
        process.cwd(),
        "data/hutbuilder-import",
        `kombinace-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`,
      );
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      JSON.stringify(
        {
          stazeno_v: new Date().toISOString(),
          noveUt,
          noveOb,
          ...meta,
        },
        null,
        2,
      ),
      "utf8",
    );
    onLog(`Uloženo do ${file} (bez zápisu do Supabase).`);
    return;
  }

  const supabase = createSupabaseServiceClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl);
      onLog(`Supabase projekt: ${u.protocol}//${u.hostname}`);
    } catch {
      onLog("Supabase projekt: (neplatná NEXT_PUBLIC_SUPABASE_URL)");
    }
  }

  const editorId = await editorUserIdZSupabase(supabase);

  onLog("Načítám stávající kombinace z Supabase…");
  const existujici = await nactiBonusKombinaceSdilene(supabase);
  if (existujici.error) {
    throw existujici.error;
  }
  onLog(
    `V DB před zápisem: útok ${existujici.utocna.length}, obrana ${existujici.obranna.length}`,
  );

  const deduped = nahradit
    ? deduplikujPayloadBonusu({
        utocna: deduplikujRadkyBonusu(noveUt, "utocna"),
        obranna: deduplikujRadkyBonusu(noveOb, "obranna"),
      })
    : deduplikujPayloadBonusu({
        utocna: deduplikujRadkyBonusu(
          [...existujici.utocna, ...noveUt],
          "utocna",
        ),
        obranna: deduplikujRadkyBonusu(
          [...existujici.obranna, ...noveOb],
          "obranna",
        ),
      });

  if (nahradit) {
    onLog("Režim přepsání: stávající řádky v DB se nahradí staženými.");
  }

  onLog(
    `Ukládám — útok ${deduped.utocna.length} řádků, obrana ${deduped.obranna.length}…`,
  );

  const uUt = await ulozBonusKombinaciSdilenou(
    supabase,
    editorId,
    "utocna",
    deduped.utocna,
  );
  if (uUt.error) throw uUt.error;
  const uOb = await ulozBonusKombinaciSdilenou(
    supabase,
    editorId,
    "obranna",
    deduped.obranna,
  );
  if (uOb.error) throw uOb.error;

  onLog(
    `\nHotovo — uloženo do bonus_kombinace_global: útok ${deduped.utocna.length}, obrana ${deduped.obranna.length}.`,
  );
  if (!editorId) {
    onLog(
      "Pozn.: updated_by zůstalo null (nenalezen admin v auth.users; volitelně HUT_IMPORT_EDITOR_USER_ID v .env).",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
