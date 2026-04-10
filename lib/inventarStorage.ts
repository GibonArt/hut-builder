import type {
  HutCard,
  Liga,
  Ruka,
  XFactorUroven,
  XFactorZaznam,
} from "@/types";
import { LIGY_V_PORADI } from "@/lib/tymyPodleLigy";
import { obnovIkonyXeFactoryZKatalogu } from "@/lib/xFactoryKatalog";
import { normalizujPozici } from "@/lib/hutPozice";

export const INVENTAR_STORAGE_KEY = "hut:inventar-karty";

const LIGY_SET = new Set<Liga>(LIGY_V_PORADI);

const RUKY_SET = new Set<Ruka>(["LR", "PR"]);

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function celeJmenoZKlasickych(krestni: string, prijmeni: string): string {
  return [krestni, prijmeni]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

function normalizeCard(raw: unknown): HutCard | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  const jmenoPrime = raw.jmeno;
  const kIn = raw.krestniJmeno;
  const pIn = raw.prijmeni;
  const ovr = raw.ovr;
  const poziceRaw = raw.pozice;
  const preferovanaRuka = raw.preferovanaRuka;
  const narodnost = raw.narodnost;
  const tym = raw.tym;
  const liga = raw.liga;
  const typKarty = raw.typKarty;
  const plat = raw.plat;
  const ap = raw.ap;
  const xFactoryRaw = raw.xFactory;

  let jmeno: string;
  if (typeof jmenoPrime === "string" && jmenoPrime.trim()) {
    jmeno = jmenoPrime.trim();
  } else if (typeof kIn === "string" && typeof pIn === "string") {
    jmeno = celeJmenoZKlasickych(kIn, pIn);
  } else {
    return null;
  }

  if (typeof id !== "string" || !id.trim()) return null;
  if (!jmeno) return null;
  if (typeof ovr !== "number" || Number.isNaN(ovr)) return null;
  const pozice =
    typeof poziceRaw === "string" ? normalizujPozici(poziceRaw) : null;
  if (!pozice) return null;
  if (typeof preferovanaRuka !== "string" || !RUKY_SET.has(preferovanaRuka as Ruka))
    return null;
  if (typeof narodnost !== "string") return null;
  if (typeof tym !== "string") return null;
  if (typeof liga !== "string" || !LIGY_SET.has(liga as Liga)) return null;
  if (typeof typKarty !== "string") return null;
  if (typeof plat !== "number" || Number.isNaN(plat)) return null;

  const card: HutCard = {
    id: id.trim(),
    jmeno,
    ovr: Math.round(ovr),
    pozice,
    preferovanaRuka: preferovanaRuka as Ruka,
    narodnost,
    tym,
    liga: liga as Liga,
    typKarty,
    plat,
  };

  if (typeof ap === "number" && !Number.isNaN(ap)) {
    card.ap = Math.round(ap);
  }

  if (Array.isArray(xFactoryRaw)) {
    const xf: XFactorZaznam[] = [];
    for (const el of xFactoryRaw) {
      if (!el || typeof el !== "object") continue;
      const o = el as Record<string, unknown>;
      const label = typeof o.label === "string" ? o.label.trim() : "";
      if (!label) continue;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : label;
      const xfU =
        typeof o.xfUroven === "string" &&
        (o.xfUroven === "gold" ||
          o.xfUroven === "silver" ||
          o.xfUroven === "bronze")
          ? (o.xfUroven as XFactorUroven)
          : undefined;
      xf.push({
        id,
        label,
        ...(typeof o.imageUrl === "string" ? { imageUrl: o.imageUrl } : {}),
        ...(typeof o.typeLabel === "string" ? { typeLabel: o.typeLabel } : {}),
        ...(typeof o.typeIconUrl === "string" ? { typeIconUrl: o.typeIconUrl } : {}),
        ...(xfU ? { xfUroven: xfU } : {}),
      });
      if (xf.length >= 3) break;
    }
    if (xf.length) {
      card.xFactory = obnovIkonyXeFactoryZKatalogu(xf);
    }
  }

  return card;
}

export function nactiInventarZLocalStorage(): HutCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INVENTAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCard).filter((c): c is HutCard => c !== null);
  } catch {
    return [];
  }
}

export function ulozInventarDoLocalStorage(karty: HutCard[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INVENTAR_STORAGE_KEY, JSON.stringify(karty));
}
