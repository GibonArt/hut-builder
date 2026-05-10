/**
 * Stáhne předgenerované kombinace z NHL HUT Builder (`php/get_lines.php`) — stejný JSON jako Combo Finder,
 * ale projede všechny stránky bez ručního klikání.
 *
 * Pozn.: Nejedná se o oficiální API; Hut Builder ho může změnit. Respektuj jejich provoz (rozumný delay).
 *
 * npm run hutbuilder:kombinace
 * npm run hutbuilder:kombinace -- --types=forwards,defense
 * npm run hutbuilder:kombinace -- --delay=400 --timeout=240000 --retries=5 --out=data/hutbuilder-combos/muj-export.json
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const UA =
  "HUT-HutbuilderCombos/1.0 (read-only pagination export; npm run hutbuilder:kombinace)";
const REFERER = "https://nhlhutbuilder.com/combo-finder.php";
const ENDPOINT = "https://nhlhutbuilder.com/php/get_lines.php";

const DEFAULT_TYPES = ["forwards", "defense", "goalie"];

function parseArgs(argv) {
  let types = [...DEFAULT_TYPES];
  let delayMs = 280;
  let timeoutMs = 240_000;
  /** Kolikrát znovu zkusit stejnou stránku při timeoutu / síťové chybě. */
  let retries = 4;
  /** Jedna složka nebo přímá cesta k .json souboru */
  let outPath = "";
  for (const a of argv) {
    if (a.startsWith("--types=")) {
      types = a
        .slice("--types=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a.startsWith("--delay=")) {
      delayMs = Math.max(0, Number(a.slice("--delay=".length)) || 280);
    } else if (a.startsWith("--timeout=")) {
      timeoutMs = Math.max(5000, Number(a.slice("--timeout=".length)) || 240_000);
    } else if (a.startsWith("--retries=")) {
      retries = Math.max(1, Math.min(20, Number(a.slice("--retries=".length)) || 4));
    } else if (a.startsWith("--out=")) {
      outPath = a.slice("--out=".length).trim();
    }
  }
  return { types, delayMs, timeoutMs, retries, outPath };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildSearchParams(lineType, page) {
  const p = new URLSearchParams();
  p.set("line_type", lineType);
  p.set("players", "[]");
  p.set("include_card_types", "[]");
  p.set("exclude_card_types", "[]");
  p.set("include_players", "[]");
  p.set("exclude_players", "[]");
  p.set("teams", "[]");
  p.set("nationalities", "[]");
  p.set("card_types", "[]");
  p.set("include_ovr", "");
  p.set("include_sal", "");
  p.set("include_ap", "");
  p.set("sort_by", "total_score");
  p.set("source_type", "");
  p.set("source_id", "");
  p.set("optimize_for", "");
  p.set("page", String(page));
  return p;
}

function signalSCasovymLimitem(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

async function fetchPage(lineType, page, timeoutMs = 180_000) {
  const qs = buildSearchParams(lineType, page).toString();
  const signal = signalSCasovymLimitem(timeoutMs);

  let res;
  try {
    res = await fetch(`${ENDPOINT}?${qs}`, {
      signal,
      headers: {
        "User-Agent": UA,
        Referer: REFERER,
        Accept: "application/json, text/plain, */*",
      },
      redirect: "follow",
    });
  } catch (e) {
    if (
      e?.name === "TimeoutError" ||
      e?.name === "AbortError" ||
      /abort/i.test(String(e?.message))
    ) {
      throw new Error(`Časový limit ${timeoutMs} ms (stránka ${page}, ${lineType})`);
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Neplatný JSON (začátek): ${text.slice(0, 120)}`);
  }
  if (data?.error) {
    throw new Error(data.message || "API vrátilo error");
  }
  return data;
}

function jeOpakovatelnaChyba(e) {
  const msg = String(e?.message ?? e);
  return (
    /Časový limit|timeout|AbortError|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(
      msg,
    ) || e?.cause?.name === "TimeoutError"
  );
}

async function fetchPageSKrkem(
  lineType,
  page,
  timeoutMs,
  maxPokusu,
  pauzaPoChybeMs,
) {
  let posledni;
  for (let pokus = 1; pokus <= maxPokusu; pokus++) {
    try {
      return await fetchPage(lineType, page, timeoutMs);
    } catch (e) {
      posledni = e;
      const znovu = pokus < maxPokusu && jeOpakovatelnaChyba(e);
      if (!znovu) throw e;
      process.stderr.write(
        `    stránka ${page}: pokus ${pokus}/${maxPokusu} selhal — čekám ${pauzaPoChybeMs} ms…\n`,
      );
      await sleep(pauzaPoChybeMs);
    }
  }
  throw posledni;
}

async function stahniVsechnyStranky(lineType, delayMs, timeoutMs, retries) {
  /** Server někdy vrací nesmyslné `total_results` / `has_more` — spoléháme na částečnou poslední stránku + deduplikaci. */
  const MAX_PAGES = 2500;
  const lines = [];
  const seenIds = new Set();
  let page = 1;
  let perPage = 20;
  let meta = null;

  const pauzaPoSelhani = Math.max(delayMs, 3500);

  for (;;) {
    process.stderr.write(`  ${lineType} — stránka ${page}…\n`);
    const chunk = await fetchPageSKrkem(
      lineType,
      page,
      timeoutMs,
      retries,
      pauzaPoSelhani,
    );
    meta = {
      total_results: chunk.total_results,
      per_page: chunk.per_page,
      page: chunk.page,
      has_more: chunk.has_more,
    };
    if (typeof chunk.per_page === "number") perPage = chunk.per_page;

    const batch = Array.isArray(chunk.lines) ? chunk.lines : [];
    if (batch.length === 0) break;

    let pridano = 0;
    for (const line of batch) {
      const id = line?.line_id;
      if (id == null) continue;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      lines.push(line);
      pridano++;
    }

    /** Opakovaná stránka bez nových řádků — zastavit (rozbité stránkování na jejich straně). */
    if (pridano === 0) break;

    /** Poslední stránka obvykle kratší než `per_page`. */
    if (batch.length < perPage) break;

    if (chunk.has_more === false) break;

    page += 1;
    if (page > MAX_PAGES) {
      meta = { ...meta, truncated: true, max_pages: MAX_PAGES };
      break;
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  return {
    line_type: lineType,
    per_page: perPage,
    lines_fetched: lines.length,
    lines,
    last_meta: meta,
  };
}

function defaultOutPath() {
  const dir = join(ROOT, "data/hutbuilder-combos");
  const iso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return join(dir, `combos-${iso}.json`);
}

async function main() {
  const { types, delayMs, timeoutMs, retries, outPath: outArg } = parseArgs(
    process.argv.slice(2),
  );

  const outFile = outArg
    ? join(ROOT, outArg)
    : defaultOutPath();
  mkdirSync(dirname(outFile), { recursive: true });

  const vysledek = {
    zdroj: "https://nhlhutbuilder.com/php/get_lines.php",
    referer: REFERER,
    stazeno_v: new Date().toISOString(),
    poznamka:
      "Surová data Combo Finderu (řádky + chemie). Import do Hut Builder bonusů není 1:1 — vyžaduje vlastní mapování.",
    typy_lajn: {},
  };

  for (const lt of types) {
    process.stderr.write(`Stahuji ${lt}…\n`);
    vysledek.typy_lajn[lt] = await stahniVsechnyStranky(
      lt,
      delayMs,
      timeoutMs,
      retries,
    );
    process.stderr.write(`  → ${vysledek.typy_lajn[lt].lines_fetched} řádků\n`);
    if (delayMs > 0) await sleep(delayMs);
  }

  writeFileSync(outFile, JSON.stringify(vysledek, null, 2), "utf8");
  process.stderr.write(`\nUloženo: ${outFile}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
