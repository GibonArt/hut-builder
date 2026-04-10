/**
 * Stáhne ikony speciálních karet (stejné PNG jako HUTDB combos/) do public/logos/hut-typy-karet/
 * a zapíše lib/hutTypyKaretLogaManifest.json (mapa soubor → lokální název).
 *
 * Seznam souborů se parsuje z lib/hutdbTypKaret.ts (comboSoubor: "*.png").
 *
 * Spuštění: npm run loga:typy-karet
 * Vynutit znovustažení (ignoruje manifest / přepíše i platné soubory): npm run loga:typy-karet:force
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TS_PATH = join(ROOT, "lib/hutdbTypKaret.ts");
const OUT_DIR = join(ROOT, "public/logos/hut-typy-karet");
const MANIFEST_PATH = join(ROOT, "lib/hutTypyKaretLogaManifest.json");

const SUPABASE_COMBOS =
  "https://cfahmyecewzymggdoebn.supabase.co/storage/v1/object/public/assets/combos";

/** Stejné soubory jako v `images/card_logos/` na NHL HUT Builder (vyžaduje Referer, jinak 302). */
const HUTBUILDER_CARD_LOGOS = "https://nhlhutbuilder.com/images/card_logos";
const HUTBUILDER_REFERER = "https://nhlhutbuilder.com/combo-finder.php";

const UA =
  "HUT-SpecialCardLogos/1.0 (local mirror of public HUTDB Supabase assets; npm run loga:typy-karet)";

const FORCE =
  process.argv.includes("--force") || process.argv.includes("-f");

/** Aby se nepřeskakovaly „úspěšně“ stažené HTML stránky (redirect / chyba) s délkou > 80 B. */
function jePlatnyObrazek(buf) {
  if (!buf || buf.length < 12) return false;
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
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

function souborJePlatnyObraz(absPath) {
  try {
    return jePlatnyObrazek(readFileSync(absPath));
  } catch {
    return false;
  }
}

function comboSouboryZHutdbTypKaret() {
  const ts = readFileSync(TS_PATH, "utf8");
  const set = new Set();
  const re = /comboSoubor:\s*"([^"]+\.(?:png|webp))"/g;
  let m;
  while ((m = re.exec(ts)) !== null) set.add(m[1]);
  return [...set].sort();
}

async function stáhni(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*", ...extraHeaders },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 80) throw new Error("příliš malý soubor");
  if (!jePlatnyObrazek(buf)) throw new Error("odpověď není PNG ani WebP");
  return buf;
}

async function main() {
  const soubory = comboSouboryZHutdbTypKaret();
  if (soubory.length === 0) {
    console.error("Nenalezen žádný comboSoubor v lib/hutdbTypKaret.ts");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let manifest = {};
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    manifest = {};
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const name of soubory) {
    const path = join(OUT_DIR, name);
    const uzJeZrcadlo =
      !FORCE &&
      manifest[name] === name &&
      existsSync(path) &&
      statSync(path).size > 80 &&
      souborJePlatnyObraz(path);
    if (uzJeZrcadlo) {
      process.stderr.write(`${name}… přeskočeno\n`);
      skip++;
      continue;
    }
    const urlSupabase = `${SUPABASE_COMBOS}/${name}`;
    const urlBuilder = `${HUTBUILDER_CARD_LOGOS}/${name}`;
    const duvod =
      FORCE && existsSync(path)
        ? "[--force] "
        : existsSync(path) && !souborJePlatnyObraz(path)
          ? "[neplatný PNG/WebP na disku] "
          : "";
    process.stderr.write(`${name}… ${duvod}`);
    try {
      let buf;
      try {
        buf = await stáhni(urlSupabase);
      } catch (e1) {
        buf = await stáhni(urlBuilder, { Referer: HUTBUILDER_REFERER });
      }
      writeFileSync(path, buf);
      manifest[name] = name;
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
      ok++;
      process.stderr.write("OK\n");
    } catch (e) {
      fail++;
      process.stderr.write(`CHYBA: ${e.message}\n`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  process.stderr.write(
    `\nHotovo: ${ok} staženo, ${skip} přeskočeno, ${fail} chyb → ${OUT_DIR}\nManifest: ${MANIFEST_PATH}\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
