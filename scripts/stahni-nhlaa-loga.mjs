/**
 * NHLAA (Alumni) — zkopíruje loga z `public/logos/NHL/` podle mapování na základní NHL tým,
 * tři defunct franchise stáhne z Wikimedia Commons. Zapisuje `lib/tymLogaManifest.json` sekci NHLAA.
 * Seznam týmů: `lib/nhlaaTymy.json` (importuje `tymyPodleLigy.ts`).
 * Quebec (JPG): po stažení běží `scripts/odstran_bile_pozadi.py` — potřeba `pip install Pillow`.
 *
 * Spuštění: npm run loga-nhlaa
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_LOGOS = join(ROOT, "public/logos");
const MANIFEST_PATH = join(ROOT, "lib/tymLogaManifest.json");

const UA = "HUT-NHLAA-Logos/1.0 (local; respectful)";

/** Stejné pravidlo jako `scripts/stahni-tym-loga.mjs`. */
function tymLogoSouborKlíč(nazev) {
  const s = nazev.normalize("NFC").trim().toLowerCase();
  const slug = s
    .replace(/\//g, "-")
    .replace(/[^0-9\p{L}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tym";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extFromType(contentType, url) {
  const u = url.toLowerCase();
  if (u.endsWith(".svg")) return "svg";
  if (u.endsWith(".png")) return "png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "jpg";
  if (contentType?.includes("svg")) return "svg";
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("jpeg")) return "jpg";
  return "png";
}

async function stáhniWikimedia(url) {
  const headers = {
    "User-Agent": UA,
    Accept: "image/*,*/*",
    Referer: "https://commons.wikimedia.org/",
  };
  let lastErr = new Error("fetch");
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers, redirect: "follow" });
    if (res.status === 429) {
      const sec = 4 + attempt * 3;
      process.stderr.write(` [429 → čekám ${sec}s]`);
      await sleep(sec * 1000);
      lastErr = new Error("HTTP 429");
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80) throw new Error("příliš malý soubor");
    return { buf, type: res.headers.get("content-type") ?? "" };
  }
  throw lastErr;
}

async function stáhniZUrl(url, referer) {
  const headers = {
    "User-Agent": UA,
    Accept: "image/*,*/*",
    Referer: referer,
  };
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 80) throw new Error("příliš malý soubor");
  return { buf, type: res.headers.get("content-type") ?? "" };
}

/** Alumni název → klíč v manifestu NHL (soubor zkopírovat). */
function alumniNaNhlTym(alumni) {
  if (alumni === "St Louis Blues Alumni") return "St. Louis Blues";
  return alumni.replace(/\s+Alumni$/, "");
}

/** Mimo NHL / Wikimedia (např. 1000logos). */
const NHLAA_CUSTOM_URL = {
  "Quebec Nordiques Alumni":
    "https://1000logos.net/wp-content/uploads/2018/06/Colorado-Avalanche-Logo-1985-1024x576.jpg",
};

/** Wikimedia — defunct franchise bez vlastního URL výše. */
const NHLAA_WIKIMEDIA = {
  "Hartford Whalers Alumni":
    "https://upload.wikimedia.org/wikipedia/commons/1/1d/Hartford-Whalers-Logo.svg",
  "Minnesota North Stars Alumni":
    "https://upload.wikimedia.org/wikipedia/commons/8/84/MinnesotaNorthStars67.svg",
};

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const nhlTab = manifest.NHL;
  if (!nhlTab || typeof nhlTab !== "object") {
    throw new Error("manifest.NHL chybí — nejdřív npm run loga (NHL)");
  }

  const nhlaaDir = join(PUBLIC_LOGOS, "NHLAA");
  mkdirSync(nhlaaDir, { recursive: true });

  if (!manifest.NHLAA) manifest.NHLAA = {};

  const NHLAA_SEZNAM = JSON.parse(
    readFileSync(join(ROOT, "lib/nhlaaTymy.json"), "utf8"),
  );

  let ok = 0;
  let fail = 0;

  for (const alumni of NHLAA_SEZNAM) {
    const base = tymLogoSouborKlíč(alumni);
    const customUrl = NHLAA_CUSTOM_URL[alumni];
    if (customUrl) {
      process.stderr.write(`NHLAA / ${alumni}… vlastní URL `);
      try {
        const { buf, type } = await stáhniZUrl(customUrl, "https://1000logos.net/");
        const ext = extFromType(type, customUrl);
        if (alumni === "Quebec Nordiques Alumni" && ext === "jpg") {
          const tmpJ = join(nhlaaDir, ".nhlaa-quebec-src.jpg");
          const outPng = join(nhlaaDir, `${base}.png`);
          writeFileSync(tmpJ, buf);
          execFileSync(
            "python3",
            [
              join(ROOT, "scripts", "odstran_bile_pozadi.py"),
              tmpJ,
              outPng,
              "--tolerance",
              "42",
            ],
            { stdio: "inherit" },
          );
          unlinkSync(tmpJ);
          manifest.NHLAA[alumni] = `${base}.png`;
          ok++;
          process.stderr.write(`→ ${base}.png (bez bílého pozadí)\n`);
        } else {
          const file = `${base}.${ext}`;
          writeFileSync(join(nhlaaDir, file), buf);
          manifest.NHLAA[alumni] = file;
          ok++;
          process.stderr.write(`→ ${file}\n`);
        }
      } catch (e) {
        fail++;
        process.stderr.write(`CHYBA: ${e.message}\n`);
      }
      await sleep(800);
      continue;
    }

    const wikiUrl = NHLAA_WIKIMEDIA[alumni];

    if (wikiUrl) {
      process.stderr.write(`NHLAA / ${alumni}… Wikimedia `);
      try {
        const { buf, type } = await stáhniWikimedia(wikiUrl);
        const ext = extFromType(type, wikiUrl);
        const file = `${base}.${ext}`;
        writeFileSync(join(nhlaaDir, file), buf);
        manifest.NHLAA[alumni] = file;
        ok++;
        process.stderr.write(`→ ${file}\n`);
      } catch (e) {
        fail++;
        process.stderr.write(`CHYBA: ${e.message}\n`);
      }
      await sleep(2800);
      continue;
    }

    const nhlKey = alumniNaNhlTym(alumni);
    const nhlFile = nhlTab[nhlKey];
    if (!nhlFile) {
      process.stderr.write(`NHLAA / ${alumni}: chybí mapování NHL → ${nhlKey}\n`);
      fail++;
      continue;
    }
    const src = join(PUBLIC_LOGOS, "NHL", nhlFile);
    if (!existsSync(src)) {
      process.stderr.write(`NHLAA / ${alumni}: chybí zdroj ${src}\n`);
      fail++;
      continue;
    }
    const ext = nhlFile.includes(".") ? nhlFile.split(".").pop() : "png";
    const file = `${base}.${ext}`;
    const dst = join(nhlaaDir, file);
    copyFileSync(src, dst);
    manifest.NHLAA[alumni] = file;
    ok++;
    process.stderr.write(`NHLAA / ${alumni}… kopie z NHL → ${file}\n`);
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  process.stderr.write(`\nHotovo: ${ok} souborů, ${fail} chyb. Manifest: ${MANIFEST_PATH}\n`);
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
