/**
 * NHL HUT Builder — jedna stránka výsledků Combo Finderu (stejné parametry jako na webu).
 */

export const HUTBUILDER_GET_LINES = "https://nhlhutbuilder.com/php/get_lines.php";
export const HUTBUILDER_COMBO_FINDER_REFERER =
  "https://nhlhutbuilder.com/combo-finder.php";

/** Bezpečný strop jedné stránky přes naši API (Synology/nginx reverse proxy bývá ~60 s). */
export const HUTBUILDER_PROXY_SAFE_TIMEOUT_MS = 52_000;

export type HutbuilderLineType = "forwards" | "defense" | "goalie";

/** Volitelné parametry stejného endpointu jako Combo Finder. */
export type HutbuilderGetLinesOpts = {
  /**
   * Např. `overall` — v synergii se objeví i boost `OVR` (u nás CLK).
   * Prázdné = výchozí řazení; typicky hodně SAL + AP, málo nebo žádné OVR.
   */
  optimizeFor?: string | null;
  /** Kolikrát znovu zavolat Hut Builder při timeoutu / síťové chybě (stejná stránka). */
  retries?: number;
};

export function buildGetLinesSearchParams(
  lineType: HutbuilderLineType,
  page: number,
  opts?: HutbuilderGetLinesOpts | null,
): URLSearchParams {
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
  p.set("optimize_for", (opts?.optimizeFor ?? "").trim());
  p.set("page", String(page));
  return p;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jeOpakovatelnaChybaHutbuilder(e: unknown): boolean {
  const msg = String(e instanceof Error ? e.message : e);
  return /časový limit|timeout|abort|fetch failed|econnreset|etimedout|enotfound|network/i.test(
    msg,
  );
}

async function fetchHutbuilderLinesPageOnce(
  lineType: HutbuilderLineType,
  page: number,
  attemptTimeoutMs: number,
  opts?: HutbuilderGetLinesOpts | null,
): Promise<unknown> {
  const qs = buildGetLinesSearchParams(lineType, page, opts).toString();
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(Math.max(5000, attemptTimeoutMs))
      : undefined;

  let res: Response;
  try {
    res = await fetch(`${HUTBUILDER_GET_LINES}?${qs}`, {
      ...(signal ? { signal } : {}),
      headers: {
        "User-Agent":
          "HUT-App/1.0 (bonus sync; same JSON as combo-finder; admin-only route)",
        Referer: HUTBUILDER_COMBO_FINDER_REFERER,
        Accept: "application/json, text/plain, */*",
      },
      redirect: "follow",
      cache: "no-store",
    });
  } catch (e) {
    if (
      e instanceof Error &&
      (e.name === "TimeoutError" ||
        e.name === "AbortError" ||
        /abort|timeout/i.test(e.message))
    ) {
      throw new Error(
        `Hut Builder neodpověděl do ${Math.round(attemptTimeoutMs / 1000)} s (stránka ${page}, ${lineType}).`,
      );
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Hut Builder HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Hut Builder nevrátil JSON: ${text.slice(0, 120)}`);
  }
}

export async function fetchHutbuilderLinesPage(
  lineType: HutbuilderLineType,
  page: number,
  timeoutMs: number,
  opts?: HutbuilderGetLinesOpts | null,
): Promise<unknown> {
  const budgetMs = Math.min(
    HUTBUILDER_PROXY_SAFE_TIMEOUT_MS,
    Math.max(8000, timeoutMs),
  );
  const maxPokusu = Math.max(1, Math.min(5, opts?.retries ?? 3));
  const pauzaPoChybeMs = 1800;
  const deadline = Date.now() + budgetMs;
  let posledni: unknown;

  for (let pokus = 1; pokus <= maxPokusu; pokus++) {
    const zbyvaMs = deadline - Date.now();
    if (zbyvaMs < 4500) break;
    const attemptTimeoutMs = Math.min(48_000, zbyvaMs - 400);
    try {
      return await fetchHutbuilderLinesPageOnce(
        lineType,
        page,
        attemptTimeoutMs,
        opts,
      );
    } catch (e) {
      posledni = e;
      const znovu =
        pokus < maxPokusu &&
        jeOpakovatelnaChybaHutbuilder(e) &&
        deadline - Date.now() > 4500;
      if (!znovu) throw e;
      await sleep(pauzaPoChybeMs);
    }
  }

  throw posledni instanceof Error
    ? posledni
    : new Error(String(posledni ?? "Hut Builder — neznámá chyba"));
}
