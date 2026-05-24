/**
 * Porovná typy karet z NHL HUT Builder (combo-finder.php) se statickým katalogem
 * v lib/hutdbTypKaret.ts a lokálními ikonami v public/logos/hut-typy-karet/.
 *
 * Spuštění: npm run typy-karet:kontrola
 * JSON výstup: npm run typy-karet:kontrola -- --json
 *
 * Exit code 1, pokud jsou nové typy,hledě na kód, změněná loga nebo chybějící ikony.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TS_PATH = join(ROOT, "lib/hutdbTypKaret.ts");
const OUT_DIR = join(ROOT, "public/logos/hut-typy-karet");
const COMBO_FINDER = "https://nhlhutbuilder.com/combo-finder.php";
const REFERER = "https://nhlhutbuilder.com/combo-finder.php";
const UA =
  "HUT-TypyKaretKontrola/1.0 (compare combo-finder vs hutdbTypKaret.ts; npm run typy-karet:kontrola)";

const JSON_OUT = process.argv.includes("--json");

function normalizujFiltr(text) {
  return text.replace(/\s+/g, " ").trim().toUpperCase();
}

function parseCardTypesFromHtml(html) {
  const byLogo = new Map();
  const pairs = [
    [
      /data-card-type-logo="([^"]+\.(?:png|webp))"[^>]*data-card-type-name="([^"]+)"/gi,
      "logoFirst",
    ],
    [
      /data-card-type-name="([^"]+)"[^>]*data-card-type-logo="([^"]+\.(?:png|webp))"/gi,
      "nameFirst",
    ],
  ];
  for (const [re, order] of pairs) {
    let m;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(html)) !== null) {
      const logo = order === "logoFirst" ? m[1] : m[2];
      const name = order === "logoFirst" ? m[2] : m[1];
      const nm = name.trim();
      if (logo && nm) byLogo.set(logo.trim(), nm);
    }
  }
  return [...byLogo.entries()].map(([logo, displayName]) => ({
    logo,
    displayName,
    filtr: normalizujFiltr(displayName),
  }));
}

function statickeRadkyZTs() {
  const ts = readFileSync(TS_PATH, "utf8");
  const radky = [];
  const re =
    /hodnotaFiltru:\s*"([^"]+)"[\s\S]*?jmenoCs:\s*"([^"]+)"[\s\S]*?comboSoubor:\s*"([^"]+\.(?:png|webp))"/g;
  let m;
  while ((m = re.exec(ts)) !== null) {
    radky.push({
      hodnotaFiltru: m[1].trim().toUpperCase(),
      jmenoCs: m[2].trim(),
      comboSoubor: m[3].trim(),
    });
  }
  const aliasNaFiltr = {};
  const aliasRe = /^\s*([A-Z0-9:_ ]+):\s*"([^"]+)"/gm;
  const aliasBlock = ts.match(
    /const ALIAS_NA_FILTR:[\s\S]*?=\s*\{([\s\S]*?)\};/,
  );
  if (aliasBlock) {
    let am;
    const ar = new RegExp(aliasRe.source, aliasRe.flags);
    while ((am = ar.exec(aliasBlock[1])) !== null) {
      aliasNaFiltr[am[1].trim().toUpperCase()] = am[2].trim().toUpperCase();
    }
  }
  return { radky, aliasNaFiltr };
}

function najdiStaticMatch(online, { radky, aliasNaFiltr }) {
  let filtr = online.filtr;
  if (aliasNaFiltr[filtr]) filtr = aliasNaFiltr[filtr];

  const presFiltr = radky.find((r) => r.hodnotaFiltru === filtr);
  if (presFiltr) return presFiltr;

  const presJmeno = radky.find(
    (r) => r.jmenoCs.toLowerCase() === online.displayName.toLowerCase(),
  );
  if (presJmeno) return presJmeno;

  return null;
}

function jePlatnyObrazek(buf) {
  if (!buf || buf.length < 12) return false;
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return true;
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return true;
  return false;
}

function chybiIkona(comboSoubor) {
  const path = join(OUT_DIR, comboSoubor);
  if (!existsSync(path)) return true;
  try {
    return !jePlatnyObrazek(readFileSync(path));
  } catch {
    return true;
  }
}

async function main() {
  const res = await fetch(COMBO_FINDER, {
    headers: {
      "User-Agent": UA,
      Referer: REFERER,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    console.error(`Combo Finder HTTP ${res.status}`);
    process.exit(2);
  }
  const html = await res.text();
  const online = parseCardTypesFromHtml(html);
  const katalog = statickeRadkyZTs();
  const onlineLoga = new Set(online.map((o) => o.logo));

  const nove = [];
  const zmenenaLoga = [];
  const chybiIkony = [];

  for (const o of online) {
    const hit = najdiStaticMatch(o, katalog);
    if (!hit) {
      nove.push(o);
      if (chybiIkona(o.logo)) chybiIkony.push({ typ: o.displayName, logo: o.logo });
      continue;
    }
    if (hit.comboSoubor !== o.logo) {
      zmenenaLoga.push({
        displayName: o.displayName,
        hodnotaFiltru: hit.hodnotaFiltru,
        staticLogo: hit.comboSoubor,
        onlineLogo: o.logo,
      });
      if (chybiIkona(o.logo)) chybiIkony.push({ typ: o.displayName, logo: o.logo });
    } else if (chybiIkona(o.logo)) {
      chybiIkony.push({ typ: hit.jmenoCs, logo: o.logo });
    }
  }

  const jenVKodu = katalog.radky.filter(
    (r) => !online.some((o) => najdiStaticMatch(o, katalog)?.hodnotaFiltru === r.hodnotaFiltru),
  );

  const vysledek = {
    online: online.length,
    static: katalog.radky.length,
    nove,
    zmenenaLoga,
    jenVKodu,
    chybiIkony,
    synchronni: nove.length === 0 && zmenenaLoga.length === 0 && chybiIkony.length === 0,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(vysledek, null, 2));
  } else {
    console.log(`Online (Combo Finder): ${online.length} typů`);
    console.log(`Statický katalog:      ${katalog.radky.length} typů`);
    console.log(`Lokální ikony:         ${readdirSync(OUT_DIR).filter((f) => /\.(png|webp)$/i.test(f)).length} souborů\n`);

    if (nove.length) {
      console.log("=== NOVÉ TYPY (online, chybí v lib/hutdbTypKaret.ts) ===");
      for (const o of nove.sort((a, b) => a.displayName.localeCompare(b.displayName))) {
        console.log(`  ${o.displayName}`);
        console.log(`    hodnotaFiltru: "${o.filtr}"`);
        console.log(`    comboSoubor:   "${o.logo}"`);
      }
      console.log("");
    } else {
      console.log("Nové typy: žádné\n");
    }

    if (zmenenaLoga.length) {
      console.log("=== ZMĚNĚNÁ LOGA (název sedí, jiný soubor) ===");
      for (const z of zmenenaLoga) {
        console.log(`  ${z.displayName} (${z.hodnotaFiltru})`);
        console.log(`    kód:    ${z.staticLogo}`);
        console.log(`    online: ${z.onlineLogo}`);
      }
      console.log("");
    } else {
      console.log("Změněná loga: žádná\n");
    }

    if (chybiIkony.length) {
      console.log("=== CHYBÍ LOKÁLNÍ IKONA ===");
      for (const c of chybiIkony) {
        console.log(`  ${c.typ} → ${c.logo}`);
      }
      console.log("  → npm run loga:typy-karet\n");
    } else {
      console.log("Chybějící ikony: žádné\n");
    }

    if (jenVKodu.length) {
      console.log("=== POUZE V KÓDU (Combo Finder je nemá — obvykle OK) ===");
      for (const r of jenVKodu) {
        console.log(`  ${r.jmenoCs} (${r.hodnotaFiltru}) → ${r.comboSoubor}`);
      }
      console.log("");
    }

    if (vysledek.synchronni) {
      console.log("Vše synchronní — katalog odpovídá Combo Finderu a ikony jsou stažené.");
    } else {
      console.log("Akce: doplň chybějící řádky do lib/hutdbTypKaret.ts, pak npm run loga:typy-karet");
      console.log("      (volitelně admin sync do Supabase: Nastavení bonusů → Synchronizovat typy karet)");
    }
  }

  if (!vysledek.synchronni) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
