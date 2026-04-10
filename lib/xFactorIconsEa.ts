/**
 * Ikony X-Faktorů: offline `xFactorIconsLokalni.json` → EA drop-assets → HUTDB (3 úrovně) → HUT Builder proxy.
 * `xFactorIconsEa.json`: `npm run xfactor-icons-ea` (hub ?page=1 a ?page=2;
 * https://www.ea.com/games/nhl/nhl-26/nhl26-x-factors-hub ).
 * Tříbarevné lokální kopie z HUTDB: `npm run xfactor-ikony-urovne` (PNG nebo AVIF podle obsahu).
 */
import raw from "./xFactorIconsEa.json";
import {
  hutbuilderIconUrlProEaJmenoAUroven,
  hutbuilderIconUrlProEaShodyAUroven,
} from "./xFactorIconsHutbuilder";
import {
  hutdbIconUrlProEaJmenoAUroven,
  hutdbIconUrlProEaShodyAUroven,
} from "./xFactorIconsHutdb";
import { lokalniXFactorUrl } from "./xFactorIconsLokalni";
import type { XFactorUroven } from "@/types";

export const X_FACTOR_DEFAULT_ICON =
  "https://drop-assets.ea.com/images/4vl3EKoK26fmvReCAkOjL2/f9c435973877afea511ecb84fc3b47fd/NHL_logos_XFactor_X_v001_512x512_-min.png";

const EA_ICONS: Record<string, string> = raw as Record<string, string>;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const BY_NORM = new Map<string, string>();
for (const [k, v] of Object.entries(EA_ICONS)) {
  BY_NORM.set(norm(k), v);
}

function resolveEaJson(jmeno: string): string | undefined {
  const ex = EA_ICONS[jmeno];
  if (ex) return ex;
  return BY_NORM.get(norm(jmeno));
}

/**
 * Ikona podle aliasů z katalogu.
 * @param klicKatalogu — `klic` z `X_FACTORY_KATALOG` pro lokální `/logos/xfactor/…`
 */
export function iconUrlProEaShodyAUroven(
  eaShody: readonly string[],
  uroven: XFactorUroven,
  klicKatalogu?: string,
): string {
  if (!eaShody.length) return X_FACTOR_DEFAULT_ICON;
  if (klicKatalogu) {
    const loc =
      lokalniXFactorUrl(klicKatalogu, uroven) ??
      lokalniXFactorUrl(klicKatalogu, "gold");
    if (loc) return loc;
  }

  if (uroven === "gold") {
    for (const s of eaShody) {
      const u = resolveEaJson(s);
      if (u) return u;
    }
  }

  const hutdb = hutdbIconUrlProEaShodyAUroven(eaShody, uroven);
  if (hutdb) return hutdb;

  const hb = hutbuilderIconUrlProEaShodyAUroven(eaShody, uroven);
  if (hb) return hb;

  if (uroven !== "gold") {
    return iconUrlProEaShodyAUroven(eaShody, "gold", klicKatalogu);
  }

  return X_FACTOR_DEFAULT_ICON;
}

export function iconUrlProEaShody(
  eaShody: readonly string[],
  klicKatalogu?: string,
): string {
  return iconUrlProEaShodyAUroven(eaShody, "gold", klicKatalogu);
}

/** URL ikony podle anglického názvu ability (jako `id` v EA JSON). */
export function iconUrlProEaJmenoAUroven(
  jmeno: string,
  uroven: XFactorUroven,
): string {
  if (uroven === "gold") {
    const u = resolveEaJson(jmeno);
    if (u) return u;
  }
  const hutdb = hutdbIconUrlProEaJmenoAUroven(jmeno, uroven);
  const hb = hutbuilderIconUrlProEaJmenoAUroven(jmeno, uroven);
  if (uroven !== "gold") {
    return hutdb || hb || iconUrlProEaJmenoAUroven(jmeno, "gold");
  }
  return hutdb || hb || X_FACTOR_DEFAULT_ICON;
}

export function iconUrlProEaJmeno(jmeno: string): string {
  return iconUrlProEaJmenoAUroven(jmeno, "gold");
}
