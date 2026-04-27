import type { HutCard } from "@/types";

/** Poslední „slovo“ z celého jména — základ pro slug v ID karty (např. McDavid z Connora). */
function zakladSlugZJmena(jmeno: string): string {
  const parts = jmeno.trim().split(/\s+/).filter(Boolean);
  const token = parts.length ? parts[parts.length - 1]! : jmeno.trim();
  const ascii = token.normalize("NFD").replace(/\p{M}/gu, "");
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "hrac";
}

/**
 * `příjmení-ovr`; při kolizi s existující `card_slug` u stejné sady karet se přidá `-2`, `-3`, …
 */
export function vygenerujIdKarty(
  jmeno: string,
  ovr: number,
  existujici: readonly HutCard[],
): string {
  const base = `${zakladSlugZJmena(jmeno)}-${ovr}`;
  if (!existujici.some((k) => k.id === base)) return base;
  let n = 2;
  while (existujici.some((k) => k.id === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
