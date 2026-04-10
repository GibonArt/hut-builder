/**
 * Stáhne EA NHL ratings a naplní tabulku `ea_hraci_napoveda` (nápověda jmen — odděleně od `cards`).
 * Z EA: jméno, tým, pozice, pořadí + X-Faktory (`playerAbilities`, max 3) do sloupce `x_factors`.
 *
 * Spuštění: npm run ea-ratings
 *
 * Potřeba v prostředí (načte se z .env.local nebo .env v kořeni projektu):
 *   NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * SQL: supabase/ea_hraci_napoveda.sql (+ při migraci ze starého schématu ea_hraci_napoveda_migrate_jmeno.sql)
 *
 * Volitelně: EA_RATINGS_WRITE_JSON=1 → lib/eaNhl26Ratings.backup.json
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { normalizujEaXFactoryZApi } from "../lib/eaXFactors";

/** Node/tsx nenačítá .env.local automaticky (na rozdíl od Next.js). */
function nactiEnvSoubor(absPath: string) {
  if (!existsSync(absPath)) return;
  const raw = readFileSync(absPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
nactiEnvSoubor(join(ROOT, ".env.local"));
nactiEnvSoubor(join(ROOT, ".env"));
const BACKUP_OUT = join(ROOT, "lib/eaNhl26Ratings.backup.json");

const UA = "Mozilla/5.0 (compatible; HUT-private/1.0; +local-offline-cache)";
const RATINGS_URL = "https://www.ea.com/games/nhl/ratings";

type Compact = {
  id: number;
  firstName: string;
  lastName: string;
  ovr: number;
  team: string;
  positionShort: string;
  rank: number;
  xFactory: ReturnType<typeof normalizujEaXFactoryZApi>;
};

async function fetchText(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.text();
}

async function fetchJson(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json() as Promise<{
    pageProps?: { ratingDetails?: { items?: unknown[] } };
  }>;
}

function extractBuildId(html: string) {
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) throw new Error("buildId v HTML nenalezen — změnil se formát stránky.");
  return m[1];
}

function compactPlayer(raw: Record<string, unknown>): Compact {
  const team = (raw.team as { label?: string } | undefined)?.label ?? "";
  const pos = (raw.position as { shortLabel?: string } | undefined)?.shortLabel ?? "";
  return {
    id: raw.id as number,
    firstName: raw.firstName as string,
    lastName: raw.lastName as string,
    ovr: raw.overallRating as number,
    team,
    positionShort: pos,
    rank: raw.rank as number,
    xFactory: normalizujEaXFactoryZApi(raw.playerAbilities),
  };
}

function radekNapovedy(h: Compact, updatedAt: string) {
  return {
    ea_player_id: h.id,
    jmeno: `${h.firstName} ${h.lastName}`.trim(),
    team_label: h.team,
    position_short: h.positionShort,
    ea_rank: h.rank,
    x_factors: h.xFactory,
    updated_at: updatedAt,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Stahuji", RATINGS_URL);
  const html = await fetchText(RATINGS_URL);
  const buildId = extractBuildId(html);
  console.log("buildId:", buildId);

  const base = `https://www.ea.com/_next/data/${buildId}/en/games/nhl/ratings.json`;
  const hraci: Compact[] = [];
  let page = 1;
  for (;;) {
    const pageUrl = page === 1 ? base : `${base}?page=${page}`;
    const data = await fetchJson(pageUrl);
    const items = data?.pageProps?.ratingDetails?.items ?? [];
    if (!items.length) break;
    for (const item of items) {
      hraci.push(compactPlayer(item as Record<string, unknown>));
    }
    if (items.length < 50) break;
    page += 1;
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log("Staženo z EA:", hraci.length, "hráčů.");

  if (!url || !key) {
    console.warn("Supabase: přeskočeno — nastav NEXT_PUBLIC_SUPABASE_URL (nebo SUPABASE_URL) a SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const updatedAt = new Date().toISOString();
  const { error: errDel } = await supabase.from("ea_hraci_napoveda").delete().gte("ea_player_id", -1);
  if (errDel) throw new Error(`Smazání staré nápovědy: ${errDel.message}`);

  const rows = hraci.map((h) => radekNapovedy(h, updatedAt));
  const batch = 80;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const { error } = await supabase.from("ea_hraci_napoveda").insert(chunk);
    if (error) throw new Error(`Insert ea_hraci_napoveda: ${error.message}`);
  }
  console.log("Supabase: uloženo", rows.length, "řádků do ea_hraci_napoveda.");

  if (process.env.EA_RATINGS_WRITE_JSON === "1") {
    const payload = {
      zdroj: RATINGS_URL,
      stazeno: new Date().toISOString(),
      buildId,
      pocet: hraci.length,
      hraci,
    };
    writeFileSync(BACKUP_OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log("Záložní JSON:", BACKUP_OUT);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
