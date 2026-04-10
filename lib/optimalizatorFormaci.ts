import type { HutCard } from "@/types";
import type { BonusKombinaceParametr, RadekBonusKombinaceUi } from "@/lib/bonusKombinaceDb";
import type { NarodnostVolba } from "@/lib/narodnosti";

/**
 * Karta splní parametr kombinace (národnost / tým+liga / typ karty).
 */
export function kartaSplnujeParametr(
  k: HutCard,
  p: BonusKombinaceParametr,
  narodnostiVolby: readonly NarodnostVolba[],
): boolean {
  switch (p.typ) {
    case "narodnost": {
      const kod = narodnostiVolby.find((v) => v.label === k.narodnost.trim())?.code;
      return Boolean(p.narodnostKod.trim()) && kod === p.narodnostKod.trim();
    }
    case "tym":
      return (
        Boolean(p.tym.trim()) &&
        k.liga === p.liga &&
        k.tym.trim() === p.tym.trim()
      );
    case "typ_karty":
      return (
        Boolean(p.typKarty.trim()) &&
        k.typKarty.trim() === p.typKarty.trim()
      );
  }
}

export function filtrujKartyPodleOvr(
  karty: readonly HutCard[],
  minOvr: number | null,
  maxOvr: number | null,
): HutCard[] {
  return karty.filter((k) => {
    if (minOvr !== null && k.ovr < minOvr) return false;
    if (maxOvr !== null && k.ovr > maxOvr) return false;
    return true;
  });
}

export type UtocnaFormaceVysledek = {
  kombinace: RadekBonusKombinaceUi;
  lk: HutCard;
  c: HutCard;
  pk: HutCard;
};

export type DvojiceVysledek = {
  kombinace: RadekBonusKombinaceUi;
  a: HutCard;
  b: HutCard;
};

/** Permutace indexů parametrů: slot i dostane `params[perm[i]]` (LK/C/PK nebo LO/PO). */
const PERMUTACE3: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

const PERMUTACE2: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
];

/**
 * Platná trojice: existuje přiřazení tří symbolů kombinace ke třem pozicím (LK, C, PK)
 * v libovolném pořadí — LK nemusí odpovídat „param1“ z uloženého řádku.
 */
export function trojiceSplnujeKombinaciUtok(
  kLK: HutCard,
  kC: HutCard,
  kPK: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): boolean {
  const params = [r.param1, r.param2, r.param3] as const;
  const slotKarty = [kLK, kC, kPK] as const;
  return PERMUTACE3.some((perm) =>
    slotKarty.every((karta, slotIdx) =>
      kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
    ),
  );
}

/**
 * Platná dvojice: oba symboly kombinace pokryjí dvě pozice v libovolném pořadí.
 */
export function dvojiceSplnujeDvaParametry(
  kA: HutCard,
  kB: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): boolean {
  const params = [r.param1, r.param2] as const;
  const slotKarty = [kA, kB] as const;
  return PERMUTACE2.some((perm) =>
    slotKarty.every((karta, slotIdx) =>
      kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
    ),
  );
}

/**
 * První platné přiřazení symbolů ke slotům LK, C, PK (pro zobrazení u výsledku).
 */
export function prirazeniSymboluUtok(
  kLK: HutCard,
  kC: HutCard,
  kPK: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): [BonusKombinaceParametr, BonusKombinaceParametr, BonusKombinaceParametr] | null {
  const params = [r.param1, r.param2, r.param3] as const;
  const slotKarty = [kLK, kC, kPK] as const;
  for (const perm of PERMUTACE3) {
    if (
      slotKarty.every((karta, slotIdx) =>
        kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
      )
    ) {
      return [params[perm[0]!]!, params[perm[1]!]!, params[perm[2]!]!];
    }
  }
  return null;
}

/**
 * První platné přiřazení ke dvěma slotům (LO/PO nebo G/G).
 */
export function prirazeniSymboluDvojice(
  kA: HutCard,
  kB: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): [BonusKombinaceParametr, BonusKombinaceParametr] | null {
  const params = [r.param1, r.param2] as const;
  const slotKarty = [kA, kB] as const;
  for (const perm of PERMUTACE2) {
    if (
      slotKarty.every((karta, slotIdx) =>
        kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
      )
    ) {
      return [params[perm[0]!]!, params[perm[1]!]!];
    }
  }
  return null;
}

/**
 * Útočné trojice LK + C + PK; každý ze tří symbolů kombinace připadne některé pozici (libovolné pořadí).
 */
export function spoctiUtocneFormace(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
): UtocnaFormaceVysledek[] {
  const lk = karty.filter((k) => k.pozice === "LK");
  const c = karty.filter((k) => k.pozice === "C");
  const pk = karty.filter((k) => k.pozice === "PK");
  const out: UtocnaFormaceVysledek[] = [];

  for (const r of radkyKombinaci) {
    for (const kLK of lk) {
      for (const kC of c) {
        if (kC.id === kLK.id) continue;
        for (const kPK of pk) {
          if (kPK.id === kLK.id || kPK.id === kC.id) continue;
          if (!trojiceSplnujeKombinaciUtok(kLK, kC, kPK, r, narodnostiVolby)) continue;
          out.push({ kombinace: r, lk: kLK, c: kC, pk: kPK });
        }
      }
    }
  }
  return out;
}

/**
 * Obranné dvojice LO + PO; oba symboly kombinace přiřaditelné k LO/PO v libovolném pořadí.
 */
export function spoctiObranneDvojice(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
): DvojiceVysledek[] {
  const lo = karty.filter((k) => k.pozice === "LO");
  const po = karty.filter((k) => k.pozice === "PO");
  const out: DvojiceVysledek[] = [];

  for (const r of radkyKombinaci) {
    for (const kLO of lo) {
      for (const kPO of po) {
        if (kLO.id === kPO.id) continue;
        if (!dvojiceSplnujeDvaParametry(kLO, kPO, r, narodnostiVolby)) continue;
        out.push({ kombinace: r, a: kLO, b: kPO });
      }
    }
  }
  return out;
}

/**
 * Dvojice brankářů (G + G); stejná logika jako obrana (symboly v libovolném pořadí mezi G1/G2).
 * Každá neuspořádaná dvojice karet jen jednou (kanonicky nižší id jako G1).
 */
export function spoctiGolmanskeDvojice(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
): DvojiceVysledek[] {
  const gs = karty.filter((k) => k.pozice === "G");
  const out: DvojiceVysledek[] = [];

  for (const r of radkyKombinaci) {
    for (let i = 0; i < gs.length; i++) {
      for (let j = i + 1; j < gs.length; j++) {
        const g1 = gs[i]!;
        const g2 = gs[j]!;
        if (!dvojiceSplnujeDvaParametry(g1, g2, r, narodnostiVolby)) continue;
        out.push({ kombinace: r, a: g1, b: g2 });
      }
    }
  }
  return out;
}
