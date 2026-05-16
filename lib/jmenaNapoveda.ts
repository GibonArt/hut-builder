import type { HutCard } from "@/types";

/** Unikátní jména (case-insensitive), vlastní inventář má přednost v kanonickém zápisu. */
export function sestavUnikatniJmena(
  vlastniKarty: readonly HutCard[],
  zNapovedy: readonly { jmeno: string }[],
): string[] {
  const map = new Map<string, string>();
  for (const k of vlastniKarty) {
    const t = k.jmeno.trim();
    if (t) map.set(t.toLowerCase(), t);
  }
  for (const h of zNapovedy) {
    const t = h.jmeno.trim();
    if (t && !map.has(t.toLowerCase())) map.set(t.toLowerCase(), t);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "cs"));
}

export function filtrujJmenaPodleDotazu(
  jmena: readonly string[],
  dotaz: string,
  max = 12,
): string[] {
  const q = dotaz.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const j of jmena) {
    const hay = j.toLowerCase();
    if (tokens.every((t) => hay.includes(t))) {
      out.push(j);
      if (out.length >= max) break;
    }
  }
  return out;
}
