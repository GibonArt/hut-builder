/** Sezóna HUT Builderu / databáze. */
export const SEZONY = ["nhl26", "nhl27"] as const;
export type Sezona = (typeof SEZONY)[number];

export const SEZONA_VYCHOZI: Sezona = "nhl26";

export function jeSezona(raw: string | null | undefined): raw is Sezona {
  return raw === "nhl26" || raw === "nhl27";
}

export function parseSezona(raw: string | null | undefined): Sezona | null {
  const t = raw?.trim().toLowerCase();
  return jeSezona(t) ? t : null;
}

/** Cookie / localStorage — poslední zvolená sezóna na rozcestníku. */
export const HUT_SEZONA_COOKIE = "hut-sezona";
export const HUT_SEZONA_STORAGE_KEY = "hut-sezona-last";

export function labelSezony(s: Sezona): string {
  return s === "nhl27" ? "NHL 27" : "NHL 26";
}

export function cestaSezony(sezona: Sezona, path = ""): string {
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${sezona}${p}`;
}

/** CLI: `--sezona=nhl27` (výchozí nhl26). */
export function parseSezonaZArgv(
  argv: string[],
  vychozi: Sezona = SEZONA_VYCHOZI,
): Sezona {
  for (const a of argv) {
    if (a.startsWith("--sezona=")) {
      const s = parseSezona(a.slice("--sezona=".length));
      if (s) return s;
    }
  }
  return vychozi;
}

/** Query `?sezona=nhl27` na admin API (výchozí nhl26). */
export function sezonaZSearchParams(
  params: URLSearchParams | { get(name: string): string | null },
  vychozi: Sezona = SEZONA_VYCHOZI,
): Sezona {
  return parseSezona(params.get("sezona")) ?? vychozi;
}
