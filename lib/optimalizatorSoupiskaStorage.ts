import {
  TYPY_BONUSU_KOMBINACE,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";

export const SOUPISKA_POZADOVANE = {
  utok: 4,
  obrana: 3,
  golmani: 1,
} as const;

export type VyberySoupiskyPodleTypu = Record<TypBonusuKombinace, string[]>;

/** @deprecated v1 — jedna soupiska; migruje se do seznamu v2. */
export type UlozenaSoupiskaOptV1 = {
  v: 1;
  ulozeno: string;
  utok: VyberySoupiskyPodleTypu;
  obrana: VyberySoupiskyPodleTypu;
  golmani: VyberySoupiskyPodleTypu;
  platCelkem: number;
};

export type NahledHraceSoupisky = {
  id: string;
  jmeno: string;
  ovr: number;
  pozice: string;
};

export type NahledRadkuUtokSoupisky = {
  klic: string;
  bonusTyp: TypBonusuKombinace;
  bonusHodnota: number | null;
  lk: NahledHraceSoupisky;
  c: NahledHraceSoupisky;
  pk: NahledHraceSoupisky;
};

export type NahledRadkuDvojiceSoupisky = {
  klic: string;
  bonusTyp: TypBonusuKombinace;
  bonusHodnota: number | null;
  a: NahledHraceSoupisky;
  b: NahledHraceSoupisky;
};

export type NahledSoupisky = {
  utok: NahledRadkuUtokSoupisky[];
  obrana: NahledRadkuDvojiceSoupisky[];
  golmani: NahledRadkuDvojiceSoupisky[];
};

export type UlozenaSoupiskaNamedV2 = {
  v: 2;
  id: string;
  nazev: string;
  ulozeno: string;
  utok: VyberySoupiskyPodleTypu;
  obrana: VyberySoupiskyPodleTypu;
  golmani: VyberySoupiskyPodleTypu;
  platCelkem: number;
  nahled: NahledSoupisky;
};

function draftKey(userId: string): string {
  return `hut-opt-soupiska-draft-v1-${userId}`;
}

function listKey(userId: string): string {
  return `hut-opt-soupisky-v2-${userId}`;
}

function legacyKey(userId: string): string {
  return `hut-opt-soupiska-v1-${userId}`;
}

export function prazdneVyberySoupisky(): VyberySoupiskyPodleTypu {
  return { PLAT: [], CLK: [], BS: [] };
}

export function pocetRadkuSoupisky(vybery: VyberySoupiskyPodleTypu): number {
  return TYPY_BONUSU_KOMBINACE.reduce((n, t) => n + vybery[t].length, 0);
}

export function jeKompletniSoupiska(pocty: {
  utok: number;
  obrana: number;
  golmani: number;
}): boolean {
  return (
    pocty.utok === SOUPISKA_POZADOVANE.utok &&
    pocty.obrana === SOUPISKA_POZADOVANE.obrana &&
    pocty.golmani === SOUPISKA_POZADOVANE.golmani
  );
}

export function obnovVyberyZNactenych(
  ulozene: VyberySoupiskyPodleTypu,
  platneKlice: ReadonlySet<string>,
): { vybery: VyberySoupiskyPodleTypu; preskoceno: number } {
  const vybery = prazdneVyberySoupisky();
  let preskoceno = 0;
  for (const typ of TYPY_BONUSU_KOMBINACE) {
    for (const klic of ulozene[typ]) {
      if (platneKlice.has(klic)) {
        vybery[typ].push(klic);
      } else {
        preskoceno += 1;
      }
    }
  }
  return { vybery, preskoceno };
}

/** Koncept rozpracované soupisky (auto-uložení po Hledat). */
export function nactiDraftSoupisku(userId: string): UlozenaSoupiskaOptV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    if (!raw) return nactiLegacySoupisku(userId);
    const parsed = JSON.parse(raw) as UlozenaSoupiskaOptV1;
    if (parsed?.v !== 1 || typeof parsed.ulozeno !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function nactiLegacySoupisku(userId: string): UlozenaSoupiskaOptV1 | null {
  try {
    const raw = window.localStorage.getItem(legacyKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UlozenaSoupiskaOptV1;
    if (parsed?.v !== 1 || typeof parsed.ulozeno !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** @deprecated alias pro draft */
export function nactiUlozenouSoupisku(userId: string): UlozenaSoupiskaOptV1 | null {
  return nactiDraftSoupisku(userId);
}

export function ulozDraftSoupisku(
  userId: string,
  data: Omit<UlozenaSoupiskaOptV1, "v" | "ulozeno">,
): void {
  if (typeof window === "undefined") return;
  const payload: UlozenaSoupiskaOptV1 = {
    v: 1,
    ulozeno: new Date().toISOString(),
    ...data,
  };
  window.localStorage.setItem(draftKey(userId), JSON.stringify(payload));
}

/** @deprecated alias pro draft */
export function ulozSoupiskuOpt(
  userId: string,
  data: Omit<UlozenaSoupiskaOptV1, "v" | "ulozeno">,
): void {
  ulozDraftSoupisku(userId, data);
}

export function smazDraftSoupisku(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(userId));
  window.localStorage.removeItem(legacyKey(userId));
}

/** @deprecated */
export function smazUlozenouSoupisku(userId: string): void {
  smazDraftSoupisku(userId);
}

function parseSeznamV2(raw: string): UlozenaSoupiskaNamedV2[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (x): x is UlozenaSoupiskaNamedV2 =>
      !!x &&
      typeof x === "object" &&
      (x as UlozenaSoupiskaNamedV2).v === 2 &&
      typeof (x as UlozenaSoupiskaNamedV2).id === "string" &&
      typeof (x as UlozenaSoupiskaNamedV2).nazev === "string",
  );
}

export function nactiPojmenovaneSoupisky(userId: string): UlozenaSoupiskaNamedV2[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(listKey(userId));
    if (!raw) return [];
    return parseSeznamV2(raw).sort((a, b) => b.ulozeno.localeCompare(a.ulozeno));
  } catch {
    return [];
  }
}

export function ulozPojmenovanouSoupisku(
  userId: string,
  entry: Omit<UlozenaSoupiskaNamedV2, "v" | "id" | "ulozeno"> & { id?: string },
): UlozenaSoupiskaNamedV2 {
  const seznam = nactiPojmenovaneSoupisky(userId);
  const nova: UlozenaSoupiskaNamedV2 = {
    v: 2,
    id: entry.id ?? crypto.randomUUID(),
    nazev: entry.nazev.trim() || "Soupiska",
    ulozeno: new Date().toISOString(),
    utok: entry.utok,
    obrana: entry.obrana,
    golmani: entry.golmani,
    platCelkem: entry.platCelkem,
    nahled: entry.nahled,
  };
  const idx = seznam.findIndex((s) => s.id === nova.id);
  const next = idx >= 0 ? seznam.map((s, i) => (i === idx ? nova : s)) : [nova, ...seznam];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(listKey(userId), JSON.stringify(next));
  }
  return nova;
}

export function smazPojmenovanouSoupisku(userId: string, id: string): void {
  if (typeof window === "undefined") return;
  const next = nactiPojmenovaneSoupisky(userId).filter((s) => s.id !== id);
  window.localStorage.setItem(listKey(userId), JSON.stringify(next));
}
