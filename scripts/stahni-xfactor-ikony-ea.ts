/**
 * Uloží mapu ability → imageUrl do lib/xFactorIconsEa.json z oficiálního EA hub
 * (Gold / stejné assety jako na https://www.ea.com/games/nhl/nhl-26/nhl26-x-factors-hub ).
 * Načítá ?page=1 i ?page=2 — kompletní sada X-Faktorů je rozložená na dvě stránky.
 *
 * Výjimka: Wheels na hubu používá legacy soubor `wheels_1.png`, ne NHL_26_Wheels_…
 *
 * npm run xfactor-icons-ea
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../lib/xFactorIconsEa.json");

const UA = "Mozilla/5.0 (compatible; HUT-xfactor-icons/1.0)";

const HUB_BASE = "https://www.ea.com/games/nhl/nhl-26/nhl26-x-factors-hub";
const HUB_PAGES = [`${HUB_BASE}?page=1`, `${HUB_BASE}?page=2`];

/** NHL_26_{slug}_X-Factor_Image__Gold__File.png → klíč v JSON (shoda s lib/xFactoryKatalog.ts labelEn kde jde). */
const HUB_SLUG_NA_LABEL: Record<string, string> = {
  Ankle_Breaker: "Ankle Breaker",
  Backhand_Beauty: "Backhand Beauty",
  Big_Rig: "Big Rig",
  Big_Tipper: "Big Tipper",
  Born_Leader: "Born Leader",
  Dialed_In: "Dialed In",
  Elite_Edges: "Elite Edges",
  Hipster: "Hipster",
  No_Contest: "No Contest",
  One_T: "One T",
  Post_to_Post: "Post to Post",
  PressurePlus: "Pressure+",
  Quick_Draw: "Quick Draw",
  Quick_Release: "Quick Release",
  Quickpick: "Quick Pick",
  Recharge: "Recharge",
  Rocket: "Rocket",
  Second_Wind: "Second Wind",
  Send_It: "Send It",
  Show_Stopper: "Show Stopper",
  Spark_Plug: "Spark Plug",
  Sponge: "Sponge",
  Stick_Em_Up: "Stick Em Up",
  Tape_to_Tape: "Tape to Tape",
  Truculence: "Truculence",
  Unstoppable: "Unstoppable",
  Warrior: "Warrior",
};

const OCEKAVANY_POCET = Object.keys(HUB_SLUG_NA_LABEL).length + 1; /* + Wheels (jiný soubor) */

function ikonyZHuby(html: string): Map<string, string> {
  const out = new Map<string, string>();
  const re =
    /https:\/\/drop-assets\.ea\.com\/images\/[a-zA-Z0-9]+\/[a-f0-9]+\/NHL_26_([A-Za-z0-9_]+)_X-Factor_Image__Gold__File\.png/g;
  const seenPath = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1]!;
    const bezQuery = m[0]!.split("?")[0]!;
    if (seenPath.has(bezQuery)) continue;
    seenPath.add(bezQuery);
    const label = HUB_SLUG_NA_LABEL[slug];
    if (!label) {
      console.warn(`[hub] neznámý slug „${slug}“ — doplň HUB_SLUG_NA_LABEL ve skriptu`);
      continue;
    }
    if (!out.has(label)) out.set(label, bezQuery);
  }

  if (!out.has("Wheels")) {
    const wheelsRe =
      /https:\/\/drop-assets\.ea\.com\/images\/[a-zA-Z0-9]+\/[a-f0-9]+\/wheels_1\.png/;
    const wm = wheelsRe.exec(html);
    if (wm) {
      out.set("Wheels", wm[0]!.split("?")[0]!);
    } else {
      console.warn("[hub] nenalezeno wheels_1.png — Wheels bude chybět");
    }
  }

  return out;
}

async function main() {
  const chunks: string[] = [];
  for (const url of HUB_PAGES) {
    const hubHtml = await fetch(url, { headers: { "User-Agent": UA } }).then(
      (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
        return r.text();
      },
    );
    chunks.push(hubHtml);
  }
  const html = chunks.join("\n");
  const zHuby = ikonyZHuby(html);
  if (zHuby.size !== OCEKAVANY_POCET) {
    console.warn(
      `[hub] očekáváno ${OCEKAVANY_POCET} ikon, staženo ${zHuby.size} (EA mohla změnit HTML nebo slug).`,
    );
  }

  const sorted: Record<string, string> = {};
  for (const k of [...zHuby.keys()].sort((a, b) => a.localeCompare(b, "en"))) {
    sorted[k] = zHuby.get(k)!;
  }

  writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  console.error("Uloženo", Object.keys(sorted).length, "oficiálních ikon →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
