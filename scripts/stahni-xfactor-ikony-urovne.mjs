/**
 * Stáhne tříbarevné ikony X-Faktorů do public/logos/xfactor/{klic}/ a zapíše lib/xFactorIconsLokalni.json.
 * Zdroj: hutdb.app (Bronze/Silver/Gold; často AVIF pod .png). Když HUTDB vrátí HTML/404, fallback nhlhutbuilder.com
 * (specialist / all-star / elite) — musí odpovídat lib/xFactorIconsHutbuilder.ts.
 *
 * npm run xfactor-ikony-urovne
 * Jen jeden katalogový klíč: ONLY_KLIC=ankle-breaker node scripts/stahni-xfactor-ikony-urovne.mjs
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const KATALOG_PATH = join(ROOT, "lib/xFactoryKatalog.ts");
const OUT_ROOT = join(ROOT, "public/logos/xfactor");
const MANIFEST_PATH = join(ROOT, "lib/xFactorIconsLokalni.json");

const HUTDB_BASE = "https://www.hutdb.app/abilities/";
const UA =
  "HUT-XFactorTierIcons/1.0 (local mirror of hutdb.app abilities; npm run xfactor-ikony-urovne)";

const TIERS = [
  { key: "bronze", hutdb: "Bronze" },
  { key: "silver", hutdb: "Silver" },
  { key: "gold", hutdb: "Gold" },
];

function normKlíč(s) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''']/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Musí odpovídat lib/xFactorHutdbSlug.ts */
const SLUG_OVERRIDE = {
  [normKlíč("Pressure")]: "PressurePlus",
  [normKlíč("Pressure+")]: "PressurePlus",
  [normKlíč("PRESSURE+")]: "PressurePlus",
  [normKlíč("Quick Pick")]: "Quickpick",
};

function hutdbSlugZLabelEn(labelEn) {
  const o = SLUG_OVERRIDE[normKlíč(labelEn)];
  if (o) return o;
  const cleaned = labelEn
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''']/g, "")
    .trim();
  const parts = cleaned.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("_");
}

/** PNG / WebP / AVIF (ISO BMFF `ftyp`) — Netlify často hlásí `image/png` i u AVIF. */
function typStazenehoObrazku(buf) {
  if (!buf || buf.length < 12) return null;
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "png";
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
    return "webp";
  if (
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70
  )
    return "avif";
  return null;
}

const HUTBUILDER_BASE = "https://nhlhutbuilder.com/images/xfactor_icons/";

/** Musí odpovídat lib/xFactorIconsHutbuilder.ts */
const HUTBUILDER_PREFIX = {
  bronze: "specialist",
  silver: "all-star",
  gold: "elite",
};

function normHb(s) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const HUTBUILDER_SUFFIXES = new Set([
  "ANKLE_BREAKER",
  "BACKHAND_BEAUTY",
  "BIG_RIG",
  "BIG_TIPPER",
  "BORN_LEADER",
  "DIALED_IN",
  "ELITE_EDGES",
  "HIPSTER",
  "NO_CONTEST",
  "ONE_T",
  "POST_TO_POST",
  "PRESSURE_",
  "QUICK_DRAW",
  "QUICK_PICK",
  "QUICK_RELEASE",
  "RECHARGE",
  "ROCKET",
  "SECOND_WIND",
  "SEND_IT",
  "SHOW_STOPPER",
  "SPARK_PLUG",
  "SPONGE",
  "STICK___EM_UP",
  "TAPE_TO_TAPE",
  "TRUCULENCE",
  "UNSTOPPABLE",
  "WARRIOR",
  "WHEELS",
]);

const HUTBUILDER_SUFFIX_OVERRIDES = {
  [normHb("Natural Born Leader")]: "BORN_LEADER",
  [normHb("One Tee")]: "ONE_T",
  [normHb("Showstopper")]: "SHOW_STOPPER",
  [normHb("Stick Em Up")]: "STICK___EM_UP",
  [normHb("Stick 'Em Up")]: "STICK___EM_UP",
  [normHb("Unstoppable Force")]: "UNSTOPPABLE",
  [normHb("Pressure+")]: "PRESSURE_",
  [normHb("Pressure")]: "PRESSURE_",
};

function slovaNaUpperSnake(jmeno) {
  const cleaned = jmeno
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''']/g, "")
    .replace(/\+/g, " ")
    .trim();
  const parts = cleaned.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts.map((p) => p.toUpperCase()).join("_");
}

function suffixProLabelEn(labelEn) {
  const n = normHb(labelEn);
  const zOverride = HUTBUILDER_SUFFIX_OVERRIDES[n];
  if (zOverride && HUTBUILDER_SUFFIXES.has(zOverride)) return zOverride;
  const computed = slovaNaUpperSnake(labelEn);
  if (HUTBUILDER_SUFFIXES.has(computed)) return computed;
  return null;
}

function položkyZKatalogu() {
  const ts = readFileSync(KATALOG_PATH, "utf8");
  const re = /\{\s*klic:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(ts)) !== null) {
    out.push({ klic: m[1], labelEn: m[2] });
  }
  return out;
}

async function stáhniUrl(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*", ...extraHeaders },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 80) throw new Error("příliš malý soubor");
  const typ = typStazenehoObrazku(buf);
  if (!typ) throw new Error("neplatný obsah (PNG / WebP / AVIF)");
  return { buf, typ };
}

async function stáhniZHutbuilder(labelEn, tierKey) {
  const suffix = suffixProLabelEn(labelEn);
  if (!suffix) throw new Error("není v glossary HB");
  const prefix = HUTBUILDER_PREFIX[tierKey];
  const url = `${HUTBUILDER_BASE}${prefix}${suffix}.png`;
  return stáhniUrl(url, { Referer: "https://nhlhutbuilder.com/" });
}

async function stáhniTier(labelEn, tierKey, slug, hutdbTierName) {
  const hutdbUrl = `${HUTDB_BASE}NHL_26_${slug}_X-Factor_Image__${hutdbTierName}__File.png`;
  try {
    return await stáhniUrl(hutdbUrl);
  } catch (eDb) {
    try {
      return await stáhniZHutbuilder(labelEn, tierKey);
    } catch (eHb) {
      throw new Error(`HUTDB: ${eDb.message}; HB: ${eHb.message}`);
    }
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const onlyKlic = process.env.ONLY_KLIC?.trim();
  const rows = položkyZKatalogu();
  if (rows.length === 0) {
    console.error("V lib/xFactoryKatalog.ts nejsou žádné položky katalogu.");
    process.exit(1);
  }

  let manifest = {};
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    manifest = {};
  }

  mkdirSync(OUT_ROOT, { recursive: true });

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const { klic, labelEn } of rows) {
    if (onlyKlic && klic !== onlyKlic) continue;
    const slug = hutdbSlugZLabelEn(labelEn);
    const dir = join(OUT_ROOT, klic);
    mkdirSync(dir, { recursive: true });

    if (!manifest[klic]) manifest[klic] = {};

    for (const { key, hutdb } of TIERS) {
      const prevRel = manifest[klic][key];
      if (typeof prevRel === "string" && prevRel.length > 0) {
        const absPrev = join(OUT_ROOT, prevRel);
        if (existsSync(absPrev) && statSync(absPrev).size > 80) {
          skip++;
          continue;
        }
      }
      process.stderr.write(`${klic} / ${key}… `);
      try {
        const { buf, typ } = await stáhniTier(labelEn, key, slug, hutdb);
        const ext = typ;
        const rel = `${klic}/${key}.${ext}`;
        const abs = join(OUT_ROOT, klic, `${key}.${ext}`);
        for (const old of ["png", "webp", "avif"]) {
          if (old === ext) continue;
          const stale = join(OUT_ROOT, klic, `${key}.${old}`);
          try {
            if (existsSync(stale)) unlinkSync(stale);
          } catch {
            /* ignore */
          }
        }
        writeFileSync(abs, buf);
        manifest[klic][key] = rel;
        writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
        ok++;
        process.stderr.write(`OK (${ext})\n`);
      } catch (e) {
        fail++;
        process.stderr.write(`CHYBA: ${e.message}\n`);
      }
      await sleep(180);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  process.stderr.write(
    `\nHotovo: ${ok} staženo, ${skip} přeskočeno, ${fail} chyb → ${OUT_ROOT}\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
