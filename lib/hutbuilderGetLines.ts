/**
 * NHL HUT Builder — jedna stránka výsledků Combo Finderu (stejné parametry jako na webu).
 */

export const HUTBUILDER_GET_LINES = "https://nhlhutbuilder.com/php/get_lines.php";
export const HUTBUILDER_COMBO_FINDER_REFERER =
  "https://nhlhutbuilder.com/combo-finder.php";

export type HutbuilderLineType = "forwards" | "defense" | "goalie";

/** Volitelné parametry stejného endpointu jako Combo Finder. */
export type HutbuilderGetLinesOpts = {
  /**
   * Např. `overall` — v synergii se objeví i boost `OVR` (u nás CLK).
   * Prázdné = výchozí řazení; typicky hodně SAL + AP, málo nebo žádné OVR.
   */
  optimizeFor?: string | null;
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

export async function fetchHutbuilderLinesPage(
  lineType: HutbuilderLineType,
  page: number,
  timeoutMs: number,
  opts?: HutbuilderGetLinesOpts | null,
): Promise<unknown> {
  const qs = buildGetLinesSearchParams(lineType, page, opts).toString();
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(Math.max(5000, timeoutMs))
      : undefined;

  const res = await fetch(`${HUTBUILDER_GET_LINES}?${qs}`, {
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
