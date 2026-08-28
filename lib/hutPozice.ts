import type { Pozice } from "@/types";

export const HUT_POZICE: Pozice[] = ["LK", "C", "PK", "LO", "PO", "G"];

const POZICE_SET = new Set<string>(HUT_POZICE);

export const HUT_POZICE_LABEL: Record<Pozice, string> = {
  LK: "Levé křídlo (LK)",
  C: "Centr (C)",
  PK: "Pravé křídlo (PK)",
  LO: "Levý obránce (LO)",
  PO: "Pravý obránce (PO)",
  G: "Brankář (G)",
};

/** Krátký štítek do filtrů / badge. */
export const HUT_POZICE_ZKRATKA: Record<Pozice, string> = {
  LK: "LK",
  C: "C",
  PK: "PK",
  LO: "LO",
  PO: "PO",
  G: "G",
};

/**
 * Hodnota z DB, localStorage nebo starého exportu.
 * `RK` = dříve používaná anglická zkratka (right wing) → `PK` (pravé křídlo).
 */
export function normalizujPozici(raw: string): Pozice | null {
  const t = raw.trim();
  if (t === "RK") return "PK";
  if (POZICE_SET.has(t)) return t as Pozice;
  return null;
}
