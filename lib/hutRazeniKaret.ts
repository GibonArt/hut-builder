import type { HutCard } from "@/types";
import { celeJmenoHrace } from "@/types";

/** Řazení inventáře — sdílené mezi Můj inventář (náhled 4) a /moje-karty (mřížka). */
export type RazeniKaret = "pridani" | "ovr-asc" | "ovr-desc";

/** Řazení v režimu Seznam na /moje-karty. */
export type RazeniKaretSeznam = "ovr-asc" | "ovr-desc" | "jmeno-asc" | "jmeno-desc";

export const RAZENI_KARET_STORAGE_KEY = "hut-razeni-karet-v1";
export const RAZENI_KARET_SEZNAM_STORAGE_KEY = "hut-razeni-karet-seznam-v1";

export function parseRazeniZeStorage(raw: string | null): RazeniKaret | null {
  if (raw === "pridani" || raw === "ovr-asc" || raw === "ovr-desc") return raw;
  return null;
}

export function parseRazeniSeznamZeStorage(raw: string | null): RazeniKaretSeznam | null {
  if (raw === "ovr-asc" || raw === "ovr-desc" || raw === "jmeno-asc" || raw === "jmeno-desc") {
    return raw;
  }
  return null;
}

/** Sekundární řazení pro stabilní pořadí při stejném OVR. */
function cmpDruhotne(a: HutCard, b: HutCard): number {
  const j = a.jmeno.localeCompare(b.jmeno, "cs");
  if (j !== 0) return j;
  return a.id.localeCompare(b.id);
}

/** Seřadí kopii pole podle volby (pořadí „přidání“ = pořadí z DB / pole). */
export function seraditKarty(karty: readonly HutCard[], razeni: RazeniKaret): HutCard[] {
  const copy = [...karty];
  if (razeni === "ovr-asc") {
    copy.sort((a, b) => (a.ovr !== b.ovr ? a.ovr - b.ovr : cmpDruhotne(a, b)));
    return copy;
  }
  if (razeni === "ovr-desc") {
    copy.sort((a, b) => (a.ovr !== b.ovr ? b.ovr - a.ovr : cmpDruhotne(a, b)));
    return copy;
  }
  return copy;
}

/** Seřazení pro tabulkový režim Seznam (OVR nebo jméno). */
export function seraditKartySeznam(
  karty: readonly HutCard[],
  razeni: RazeniKaretSeznam,
): HutCard[] {
  if (razeni === "ovr-asc" || razeni === "ovr-desc") {
    return seraditKarty(karty, razeni);
  }
  const copy = [...karty];
  if (razeni === "jmeno-asc") {
    copy.sort((a, b) => {
      const j = celeJmenoHrace(a).localeCompare(celeJmenoHrace(b), "cs");
      if (j !== 0) return j;
      return a.ovr !== b.ovr ? a.ovr - b.ovr : a.id.localeCompare(b.id);
    });
    return copy;
  }
  copy.sort((a, b) => {
    const j = celeJmenoHrace(b).localeCompare(celeJmenoHrace(a), "cs");
    if (j !== 0) return j;
    return a.ovr !== b.ovr ? b.ovr - a.ovr : a.id.localeCompare(b.id);
  });
  return copy;
}

/** Čtyři karty do náhledu na hlavní stránce: u OVR čtyři nejnižší / nejvyšší, jinak 4 nejnovější. */
export function nahledCtyriKaret(karty: readonly HutCard[], razeni: RazeniKaret): HutCard[] {
  if (razeni === "pridani") {
    return [...karty].slice(-4).reverse();
  }
  return seraditKarty(karty, razeni).slice(0, 4);
}
