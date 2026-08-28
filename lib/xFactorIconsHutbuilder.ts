/**
 * Fallback ikony z nhlhutbuilder.com — `specialist` / `all-star` / `elite` + suffix (glossary).
 * Proxy: `/api/xfactor-hb` (Referer na jejich CDN).
 */

import type { XFactorUroven } from "@/types";

const HUTBUILDER_PREFIX: Record<XFactorUroven, string> = {
  bronze: "specialist",
  silver: "all-star",
  gold: "elite",
};

/** Známe přípony (část za tier prefixem). */
const HUTBUILDER_SUFFIXES = new Set<string>([
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

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const HUTBUILDER_SUFFIX_OVERRIDES: Record<string, string> = {
  [norm("Natural Born Leader")]: "BORN_LEADER",
  [norm("One Tee")]: "ONE_T",
  [norm("Showstopper")]: "SHOW_STOPPER",
  [norm("Stick Em Up")]: "STICK___EM_UP",
  [norm("Stick 'Em Up")]: "STICK___EM_UP",
  [norm("Unstoppable Force")]: "UNSTOPPABLE",
  [norm("Pressure+")]: "PRESSURE_",
  [norm("Pressure")]: "PRESSURE_",
};

function slovaNaUpperSnake(jmeno: string): string {
  const cleaned = jmeno
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''']/g, "")
    .replace(/\+/g, " ")
    .trim();
  const parts = cleaned.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts.map((p) => p.toUpperCase()).join("_");
}

function suffixProEaJmeno(jmeno: string): string | undefined {
  const n = norm(jmeno);
  const zOverride = HUTBUILDER_SUFFIX_OVERRIDES[n];
  if (zOverride && HUTBUILDER_SUFFIXES.has(zOverride)) return zOverride;
  const computed = slovaNaUpperSnake(jmeno);
  if (HUTBUILDER_SUFFIXES.has(computed)) return computed;
  return undefined;
}

export function hutbuilderIconUrlProEaJmenoAUroven(
  jmeno: string,
  uroven: XFactorUroven,
): string | undefined {
  const suffix = suffixProEaJmeno(jmeno);
  if (!suffix) return undefined;
  const file = `${HUTBUILDER_PREFIX[uroven]}${suffix}.png`;
  return `/api/xfactor-hb?${new URLSearchParams({ file }).toString()}`;
}

export function hutbuilderIconUrlProEaJmeno(jmeno: string): string | undefined {
  return hutbuilderIconUrlProEaJmenoAUroven(jmeno, "gold");
}

export function hutbuilderIconUrlProEaShodyAUroven(
  eaShody: readonly string[],
  uroven: XFactorUroven,
): string | undefined {
  for (const s of eaShody) {
    const u = hutbuilderIconUrlProEaJmenoAUroven(s, uroven);
    if (u) return u;
  }
  return undefined;
}

export function hutbuilderIconUrlProEaShody(
  eaShody: readonly string[],
): string | undefined {
  return hutbuilderIconUrlProEaShodyAUroven(eaShody, "gold");
}
