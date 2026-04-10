import type { XFactorZaznam } from "@/types";
import {
  iconUrlProEaJmeno,
  iconUrlProEaJmenoAUroven,
  iconUrlProEaShody,
  iconUrlProEaShodyAUroven,
} from "@/lib/xFactorIconsEa";
import { xfUrovenZEaTypeLabel } from "@/lib/xfUroven";

export {
  X_FACTOR_DEFAULT_ICON,
  iconUrlProEaJmeno,
  iconUrlProEaJmenoAUroven,
  iconUrlProEaShody,
  iconUrlProEaShodyAUroven,
} from "@/lib/xFactorIconsEa";

/**
 * Oficiální X-Faktory z EA hub (obě stránky):
 * https://www.ea.com/games/nhl/nhl-26/nhl26-x-factors-hub?page=1
 * https://www.ea.com/games/nhl/nhl-26/nhl26-x-factors-hub?page=2
 * Ikony: `npm run xfactor-icons-ea` → `lib/xFactorIconsEa.json`.
 */
export type XFactoryKatalogPolozka = {
  klic: string;
  labelEn: string;
  /** EA / HUTDB názvy pro párování (včetně UPPERCASE z HUTDB). */
  eaShody: readonly string[];
};

export const X_FACTORY_KATALOG: readonly XFactoryKatalogPolozka[] = [
  { klic: "ankle-breaker", labelEn: "Ankle Breaker", eaShody: ["Ankle Breaker", "ANKLE BREAKER"] },
  {
    klic: "backhand-beauty",
    labelEn: "Backhand Beauty",
    eaShody: ["Backhand Beauty", "BACKHAND BEAUTY"],
  },
  { klic: "big-rig", labelEn: "Big Rig", eaShody: ["Big Rig", "BIG RIG"] },
  { klic: "big-tipper", labelEn: "Big Tipper", eaShody: ["Big Tipper", "BIG TIPPER"] },
  {
    klic: "natural-born-leader",
    labelEn: "Born Leader",
    eaShody: ["Born Leader", "Natural Born Leader", "BORN LEADER"],
  },
  { klic: "dialed-in", labelEn: "Dialed In", eaShody: ["Dialed In", "DIALED IN"] },
  { klic: "elite-edges", labelEn: "Elite Edges", eaShody: ["Elite Edges", "ELITE EDGES"] },
  { klic: "hipster", labelEn: "Hipster", eaShody: ["Hipster", "HIPSTER"] },
  { klic: "no-contest", labelEn: "No Contest", eaShody: ["No Contest", "NO CONTEST"] },
  {
    klic: "one-tee",
    labelEn: "One T",
    eaShody: ["One T", "One Tee", "ONE T"],
  },
  { klic: "post-to-post", labelEn: "Post to Post", eaShody: ["Post to Post", "POST TO POST"] },
  {
    klic: "pressure",
    labelEn: "Pressure+",
    eaShody: ["Pressure+", "Pressure", "PRESSURE+"],
  },
  { klic: "quick-draw", labelEn: "Quick Draw", eaShody: ["Quick Draw", "QUICK DRAW"] },
  { klic: "quick-pick", labelEn: "Quick Pick", eaShody: ["Quick Pick", "QUICK PICK"] },
  {
    klic: "quick-release",
    labelEn: "Quick Release",
    eaShody: ["Quick Release", "QUICK RELEASE"],
  },
  { klic: "recharge", labelEn: "Recharge", eaShody: ["Recharge", "RECHARGE"] },
  { klic: "rocket", labelEn: "Rocket", eaShody: ["Rocket", "ROCKET"] },
  { klic: "second-wind", labelEn: "Second Wind", eaShody: ["Second Wind", "SECOND WIND"] },
  { klic: "send-it", labelEn: "Send It", eaShody: ["Send It", "SEND IT"] },
  { klic: "show-stopper", labelEn: "Show Stopper", eaShody: ["Show Stopper", "SHOW STOPPER"] },
  { klic: "spark-plug", labelEn: "Spark Plug", eaShody: ["Spark Plug", "SPARK PLUG"] },
  { klic: "sponge", labelEn: "Sponge", eaShody: ["Sponge", "SPONGE"] },
  {
    klic: "stick-em-up",
    labelEn: "Stick Em Up",
    eaShody: ["Stick Em Up", "STICK EM UP"],
  },
  {
    klic: "tape-to-tape",
    labelEn: "Tape to Tape",
    eaShody: ["Tape to Tape", "TAPE TO TAPE"],
  },
  { klic: "truculence", labelEn: "Truculence", eaShody: ["Truculence", "TRUCULENCE"] },
  {
    klic: "unstoppable",
    labelEn: "Unstoppable",
    eaShody: ["Unstoppable", "UNSTOPPABLE"],
  },
  { klic: "warrior", labelEn: "Warrior", eaShody: ["Warrior", "WARRIOR"] },
  { klic: "wheels", labelEn: "Wheels", eaShody: ["Wheels", "WHEELS"] },
];

const OPTION_VLASTNI = "__vlastni__";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function najdiVKataloguPodleEa(
  eaId: string,
  eaLabel: string,
): XFactoryKatalogPolozka | undefined {
  const a = norm(eaId);
  const b = norm(eaLabel);
  for (const row of X_FACTORY_KATALOG) {
    for (const shoda of row.eaShody) {
      const s = norm(shoda);
      if (s === a || s === b) return row;
    }
  }
  return undefined;
}

/**
 * Nahradí uložené `imageUrl` v kartě aktuálními z katalogu / `xFactorIconsEa.json`
 * (a fallbacků podle úrovně). Volat při načtení z DB nebo localStorage a před zápisem `atributy`.
 */
export function obnovIkonyXeFactoryZKatalogu(
  xf: XFactorZaznam[] | undefined,
): XFactorZaznam[] | undefined {
  if (!xf?.length) return xf;
  return xf.map((x) => {
    const u = x.xfUroven ?? "gold";
    const hit = najdiVKataloguPodleEa(x.id, x.label);
    if (hit) {
      return {
        ...x,
        id: hit.klic,
        label: hit.labelEn,
        imageUrl: iconUrlProEaShodyAUroven(hit.eaShody, u, hit.klic),
      };
    }
    return {
      ...x,
      imageUrl: iconUrlProEaJmenoAUroven(x.label, u),
    };
  });
}

export function polozkaPodleKlice(
  klic: string,
): XFactoryKatalogPolozka | undefined {
  return X_FACTORY_KATALOG.find((p) => p.klic === klic);
}

export function klicProSelect(xf: XFactorZaznam): string {
  if (!xf.label.trim()) return "";
  if (xf.id === "vlastni") return OPTION_VLASTNI;
  const podleId = polozkaPodleKlice(xf.id);
  if (podleId) return podleId.klic;
  const podleEa = najdiVKataloguPodleEa(xf.id, xf.label);
  if (podleEa) return podleEa.klic;
  if (X_FACTORY_KATALOG.some((p) => p.labelEn === xf.label)) {
    return X_FACTORY_KATALOG.find((p) => p.labelEn === xf.label)!.klic;
  }
  return OPTION_VLASTNI;
}

export function xFactorZApiNaFormular(ea: XFactorZaznam): XFactorZaznam {
  const u = xfUrovenZEaTypeLabel(ea.typeLabel);
  const hit = najdiVKataloguPodleEa(ea.id, ea.label);
  if (hit) {
    return {
      id: hit.klic,
      label: hit.labelEn,
      imageUrl:
        ea.imageUrl ??
        iconUrlProEaShodyAUroven(hit.eaShody, u, hit.klic),
      typeLabel: ea.typeLabel,
      typeIconUrl: ea.typeIconUrl,
      xfUroven: u,
    };
  }
  return {
    ...ea,
    id: "vlastni",
    label: ea.label.trim(),
    imageUrl: ea.imageUrl ?? iconUrlProEaJmenoAUroven(ea.label, u),
    xfUroven: u,
  };
}

export { OPTION_VLASTNI };
