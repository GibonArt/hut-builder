/**
 * Krok 2 — import kombinací z Hut Builderu do Supabase (bonus_kombinace_global).
 * Stejná logika jako tlačítko „Načíst kombinace z Hut Builderu“ v Nastavení bonusů.
 *
 * Vyžaduje v .env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Volitelně: HUT_IMPORT_EDITOR_USER_ID (UUID admina pro updated_by)
 *
 * npm run import:hutbuilder-kombinace
 * npm run import:hutbuilder-kombinace -- --timeout=300000
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
import { stahniKombinaceZHutbuilder, VYCHOZI_PRUCHODY_IMPORTU } from "@/lib/hutbuilderImportKombinaceRun";
import {
  createSupabaseServiceClient,
  editorUserIdZSupabase,
} from "@/lib/supabaseServiceClient";

function parseArgs(argv: string[]) {
  let jenStahnout = false;
  let outPath = "";
  let delayMs = 280;
  let timeoutMs = 240_000;
  for (const a of argv) {
    if (a === "--jen-stahnout") jenStahnout = true;
    else if (a.startsWith("--out=")) outPath = a.slice("--out=".length).trim();
    else if (a.startsWith("--delay=")) {
      delayMs = Math.max(0, Number(a.slice("--delay=".length)) || 280);
    } else if (a.startsWith("--timeout=")) {
      timeoutMs = Math.max(30_000, Number(a.slice("--timeout=".length)) || 240_000);
    }
  }
  return { jenStahnout, outPath, delayMs, timeoutMs };
}

async function main() {
  const { jenStahnout, outPath, delayMs, timeoutMs } = parseArgs(process.argv.slice(2));

  const onLog = (msg: string) => process.stderr.write(`${msg}\n`);

  onLog(
    `Začínám stahování z Hut Builderu (timeout ${Math.round(timeoutMs / 1000)} s na pokus, může trvat dlouho)…`,
  );
  const stazeno = await stahniKombinaceZHutbuilder({
    delayMs,
    onLog,
    presProxy: false,
    pruchody: VYCHOZI_PRUCHODY_IMPORTU.map((p) => ({ ...p, timeoutMs })),
  });

  onLog(
    `Staženo: ${stazeno.stazenychStranek} stránek, ${stazeno.unikatnichLineId} line_id, nových řádků útok ${stazeno.noveUt.length}, obrana ${stazeno.noveOb.length}`,
  );
  if (stazeno.noveUt.length === 0 && stazeno.noveOb.length > 0) {
    onLog(
      "Varování: z Hut Builderu nepřišly žádné útočné řádky — zkontroluj, že proběhl i průchod forwards.",
    );
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
          ...stazeno,
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
  const editorId = await editorUserIdZSupabase(supabase);

  onLog("Načítám stávající kombinace z Supabase…");
  const existujici = await nactiBonusKombinaceSdilene(supabase);
  if (existujici.error) {
    throw existujici.error;
  }
  onLog(
    `V DB před sloučením: útok ${existujici.utocna.length}, obrana ${existujici.obranna.length}`,
  );

  const merged = {
    utocna: deduplikujRadkyBonusu(
      [...existujici.utocna, ...stazeno.noveUt],
      "utocna",
    ),
    obranna: deduplikujRadkyBonusu(
      [...existujici.obranna, ...stazeno.noveOb],
      "obranna",
    ),
  };
  const deduped = deduplikujPayloadBonusu(merged);

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
