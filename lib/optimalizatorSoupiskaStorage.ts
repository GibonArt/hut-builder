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

export type UlozenaSoupiskaOptV1 = {
  v: 1;
  ulozeno: string;
  utok: VyberySoupiskyPodleTypu;
  obrana: VyberySoupiskyPodleTypu;
  golmani: VyberySoupiskyPodleTypu;
  platCelkem: number;
};

function storageKey(userId: string): string {
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

export function nactiUlozenouSoupisku(userId: string): UlozenaSoupiskaOptV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UlozenaSoupiskaOptV1;
    if (parsed?.v !== 1 || typeof parsed.ulozeno !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ulozSoupiskuOpt(
  userId: string,
  data: Omit<UlozenaSoupiskaOptV1, "v" | "ulozeno">,
): void {
  if (typeof window === "undefined") return;
  const payload: UlozenaSoupiskaOptV1 = {
    v: 1,
    ulozeno: new Date().toISOString(),
    ...data,
  };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

export function smazUlozenouSoupisku(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(userId));
}
