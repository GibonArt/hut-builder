export type OdehranyZapas = {
  id: string;
  /** ISO datum YYYY-MM-DD */
  datum: string;
  souper: string;
  skore: string;
  poznamka: string;
};

export type UlozeneZapasyV1 = {
  v: 1;
  ulozeno: string;
  zapasy: OdehranyZapas[];
};

function storageKey(userId: string): string {
  return `hut-zapasy-v1-${userId}`;
}

export function dnesIsoDatum(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function seraditZapasyPodleData(
  zapasy: readonly OdehranyZapas[],
): OdehranyZapas[] {
  return [...zapasy].sort((a, b) => {
    const cmp = b.datum.localeCompare(a.datum);
    if (cmp !== 0) return cmp;
    return b.id.localeCompare(a.id);
  });
}

export function nactiUlozeneZapasy(userId: string): UlozeneZapasyV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UlozeneZapasyV1;
    if (parsed?.v !== 1 || !Array.isArray(parsed.zapasy)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ulozZapasy(userId: string, zapasy: readonly OdehranyZapas[]): void {
  if (typeof window === "undefined") return;
  const payload: UlozeneZapasyV1 = {
    v: 1,
    ulozeno: new Date().toISOString(),
    zapasy: [...zapasy],
  };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

export function smazUlozeneZapasy(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(userId));
}

export function normalizujZapasZFormulare(raw: {
  datum: string;
  souper: string;
  skore: string;
  poznamka: string;
}): OdehranyZapas | null {
  const datum = raw.datum.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return null;
  const skore = raw.skore.trim();
  if (!skore) return null;
  return {
    id: crypto.randomUUID(),
    datum,
    souper: raw.souper.trim(),
    skore,
    poznamka: raw.poznamka.trim(),
  };
}
