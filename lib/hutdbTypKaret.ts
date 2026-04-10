/**
 * Typy karet podle HUTDB (filtry / chemistry) — názvy a zkratky z jejich frontend bundle.
 * Ikony z mřížky „Special Cards“ na chemistry jsou stejné PNG v `assets/combos/` (mapa `Bg` v jejich JS),
 * nejsou samostatná „square“ URL — zobrazují se jako čtverec přes `object-contain`.
 *
 * Zdroj názvů: minifikovaný JS z https://www.hutdb.app/ (mapa zkratek → plný název).
 * Obrázky: lokálně v `public/logos/hut-typy-karet/` (generuje `npm run loga:typy-karet`, manifest
 * `lib/hutTypyKaretLogaManifest.json`). Chybí-li záznam, fallback na veřejné Supabase combos.
 */

import typyKaretLogaManifest from "./hutTypyKaretLogaManifest.json";

export const HUTDB_SUPABASE_PUBLIC_ASSETS =
  "https://cfahmyecewzymggdoebn.supabase.co/storage/v1/object/public/assets";

const LOKALNI_TYPY_KARET = typyKaretLogaManifest as Record<string, string>;

export interface HutDbTypKarty {
  /** Hodnota ve filtrech HUTDB (VELKÁ PÍSMENA) — ukládá se do `HutCard.typKarty`. */
  hodnotaFiltru: string;
  jmenoCs: string;
  popisCs: string;
  /** Název souboru v `combos/`; null = v datech chemistry není samostatné logo této sady. */
  comboSoubor: string | null;
}

const RADKY: HutDbTypKarty[] = [
  {
    hodnotaFiltru: "ALUMNI",
    jmenoCs: "Alumni",
    popisCs:
      "Karty absolventů / univerzitní řada — stejná ikona jako v chemistry (combo asset).",
    comboSoubor: "ALUM1863645152.png",
  },
  {
    hodnotaFiltru: "BASE",
    jmenoCs: "Základní",
    popisCs: "Standardní karta bez prémiové sady — základní výběr v HUT.",
    comboSoubor: "BA43443152.png",
  },
  {
    hodnotaFiltru: "CAPTAINS",
    jmenoCs: "Kapitáni",
    popisCs: "Sada zaměřená na kapitány týmů.",
    comboSoubor: "CAP547305595.png",
  },
  {
    hodnotaFiltru: "CHEL WEEK",
    jmenoCs: "CHEL týden",
    popisCs: "Obsah vázaný na World of CHEL / týdenní akce v tomto režimu.",
    comboSoubor: "CHEL1483448997.png",
  },
  {
    hodnotaFiltru: "CHECK MY GAME",
    jmenoCs: "Check My Game",
    popisCs: "Marketingová / obsahová řada Check My Game v HUT.",
    comboSoubor: "CMG619241591.png",
  },
  {
    hodnotaFiltru: "COMBO NEXUS",
    jmenoCs: "Combo Nexus",
    popisCs: "Chemie a sada Combo Nexus (NHL 26).",
    comboSoubor: "COM221123347.png",
  },
  {
    hodnotaFiltru: "FACEOFF: INSIDE THE NHL",
    jmenoCs: "FACEOFF: Inside the NHL",
    popisCs: "Řada FACEOFF: Inside the NHL (NHL 26).",
    comboSoubor: "FACE1112398136.png",
  },
  {
    hodnotaFiltru: "FANTASY HOCKEY",
    jmenoCs: "Fantasy Hockey",
    popisCs: "Karty navázané na režim Fantasy Hockey.",
    comboSoubor: "FANT1310536400.png",
  },
  {
    hodnotaFiltru: "FRESH ICE",
    jmenoCs: "Fresh Ice",
    popisCs: "Řada Fresh Ice — sezónní / akční obsah v HUT.",
    comboSoubor: "FI202717448.png",
  },
  {
    hodnotaFiltru: "GRUDGE MATCH",
    jmenoCs: "Grudge Match",
    popisCs: "Tématika rivalit a vyhraných soubojů mezi týmy nebo hráči.",
    comboSoubor: "GM1452322051.png",
  },
  {
    hodnotaFiltru: "HUT CHAMPIONS",
    jmenoCs: "HUT Champions",
    popisCs: "Obsah a odměny z konkurenčního módu HUT Champions.",
    comboSoubor: "HUTC1625812762.png",
  },
  {
    hodnotaFiltru: "HUT BEAST MODE",
    jmenoCs: "HUT Beast Mode",
    popisCs: "Řada Beast Mode (NHL 26) — combo ikona z EA assets.",
    comboSoubor: "BEM1746395516.png",
  },
  {
    hodnotaFiltru: "HUT GAME BREAKERS",
    jmenoCs: "HUT Game Breakers",
    popisCs: "Prémiová řada „game breakers“ — silné karty mimo základ.",
    comboSoubor: "GB532693055.png",
  },
  {
    hodnotaFiltru: "HUT HEROES",
    jmenoCs: "HUT Heroes",
    popisCs: "Hrdinové režimu HUT — tematické výběry hráčů.",
    comboSoubor: "HH53168636.png",
  },
  {
    hodnotaFiltru: "HUT ODR SZN",
    jmenoCs: "HUT ODR sezóna",
    popisCs: "Obsah kolem draftu a ODR sezóny v HUT.",
    comboSoubor: "ODR20726045.png",
  },
  {
    hodnotaFiltru: "HUT RANKED SEASONS",
    jmenoCs: "HUT Ranked sezóny",
    popisCs: "Karty a odměny z řazených (ranked) sezón.",
    comboSoubor: "HRS122152053.png",
  },
  {
    hodnotaFiltru: "ICONS",
    jmenoCs: "Ikony",
    popisCs: "Legendy a bývalé hvězdy — ikonické karty.",
    comboSoubor: "ICON1839666300.png",
  },
  {
    hodnotaFiltru: "IGNITED",
    jmenoCs: "Ignited",
    popisCs: "Řada Ignited — prémiový vizuál a silné itemy.",
    comboSoubor: "IG928726709.png",
  },
  {
    hodnotaFiltru: "MARQUEE",
    jmenoCs: "Marquee",
    popisCs: "Zvýrazněné hvězdy ligy — „marquee“ výběr.",
    comboSoubor: "MARQ143459967.png",
  },
  {
    hodnotaFiltru: "MILESTONES",
    jmenoCs: "Milníky",
    popisCs: "Kariérní milníky, jubilea a rekordní okamžiky.",
    comboSoubor: "MILE127268689.png",
  },
  {
    hodnotaFiltru: "NEXT GEN",
    jmenoCs: "Next Gen",
    popisCs: "Řada Next Gen (NHL 26).",
    comboSoubor: "NG1335151415.png",
  },
  {
    hodnotaFiltru: "PINNACLE",
    jmenoCs: "Pinnacle",
    popisCs: "Vrcholová prémiová řada karet.",
    comboSoubor: "PIN1538138735.png",
  },
  {
    hodnotaFiltru: "PROTOTYPES",
    jmenoCs: "Prototypes",
    popisCs: "Experimentální / prototypová řada itemů.",
    comboSoubor: "PRO57368283.png",
  },
  {
    hodnotaFiltru: "RECORD BREAKERS",
    jmenoCs: "Překonávání rekordů",
    popisCs: "Karty u příležitosti překonaných ligových rekordů.",
    comboSoubor: "RB1226598739.png",
  },
  {
    hodnotaFiltru: "ROOKIES",
    jmenoCs: "Nováčci",
    popisCs: "Nováčci NHL — rookies.",
    comboSoubor: "ROOK1417005474.png",
  },
  {
    hodnotaFiltru: "SPOTLIGHT",
    jmenoCs: "Spotlight",
    popisCs: "Karty ve středu pozornosti — spotlight sada.",
    comboSoubor: "SPOT1973133835.png",
  },
  {
    hodnotaFiltru: "STARS OF THE MONTH",
    jmenoCs: "Hvězdy měsíce",
    popisCs: "Nejlepší hráči podle měsíčního výkonu v NHL.",
    comboSoubor: "SOTM1890082452.png",
  },
  {
    hodnotaFiltru: "SUPERSTAR ORIGINS",
    jmenoCs: "Superstar Origins",
    popisCs: "Původ a rozjezd dnešních superhvězd.",
    comboSoubor: "SO1183858855.png",
  },
  {
    hodnotaFiltru: "TEAM OF THE SEASON",
    jmenoCs: "Tým sezóny (TOTS)",
    popisCs: "Nejlepší výkony napříč sezónou — obdoba TOTS.",
    comboSoubor: "TOTS1189620133.png",
  },
  {
    hodnotaFiltru: "TEAM OF THE WEEK",
    jmenoCs: "Tým týdne (TOTW)",
    popisCs: "Týdenní výběr podle aktuální formy v NHL.",
    comboSoubor: "TOTW1700000371.png",
  },
  {
    hodnotaFiltru: "TEAM OF THE YEAR",
    jmenoCs: "Tým roku (TOTY)",
    popisCs: "Nejžádanější roční sada — špička výkonů za rok.",
    comboSoubor: "TOTY1351453298.png",
  },
  {
    hodnotaFiltru: "TRADE QUEST",
    jmenoCs: "Trade Quest",
    popisCs: "Obsah vázaný na úkoly a progres obchodování.",
    comboSoubor: "TQ269864068.png",
  },
  {
    hodnotaFiltru: "TRANSACTIONS",
    jmenoCs: "Transactions",
    popisCs: "Karty z transakční / přestupové tematiky.",
    comboSoubor: "TRAN513714278.png",
  },
  {
    hodnotaFiltru: "XP",
    jmenoCs: "XP",
    popisCs: "Karty nebo odměny ze zkušenostního (XP) systému HUT.",
    comboSoubor: "XP611618000.png",
  },
  {
    hodnotaFiltru: "26",
    jmenoCs: "26",
    popisCs: "Sezónní odznak / typ karty NHL 26 (štít s číslem 26).",
    comboSoubor: "NHL26.png",
  },
];

/**
 * Pořadí typů jako v mapě `Bd` na hutdb.app — vhodné pro mřížku ikon (Special Cards).
 */
const PORADI_MRIZKY_CHEMISTRY: string[] = [
  "ALUMNI",
  "BASE",
  "CAPTAINS",
  "CHEL WEEK",
  "CHECK MY GAME",
  "COMBO NEXUS",
  "FACEOFF: INSIDE THE NHL",
  "FANTASY HOCKEY",
  "FRESH ICE",
  "HUT GAME BREAKERS",
  "GRUDGE MATCH",
  "HUT HEROES",
  "HUT RANKED SEASONS",
  "HUT CHAMPIONS",
  "HUT BEAST MODE",
  "ICONS",
  "IGNITED",
  "MARQUEE",
  "MILESTONES",
  "NEXT GEN",
  "HUT ODR SZN",
  "PINNACLE",
  "PROTOTYPES",
  "RECORD BREAKERS",
  "ROOKIES",
  "SUPERSTAR ORIGINS",
  "STARS OF THE MONTH",
  "SPOTLIGHT",
  "TRADE QUEST",
  "TEAM OF THE SEASON",
  "TEAM OF THE WEEK",
  "TRANSACTIONS",
  "TEAM OF THE YEAR",
  "XP",
  "26",
];

const PODLE_FILTRU = new Map(
  RADKY.map((r) => [r.hodnotaFiltru.toUpperCase(), r]),
);

/** Zkratky a legacy text → canonical `hodnotaFiltru`. */
const ALIAS_NA_FILTR: Record<string, string> = {
  /** Duplicita s Kapitáni — staré uložené řádky / EA text. */
  "CHASE CAPTAINS": "CAPTAINS",
  TOTW: "TEAM OF THE WEEK",
  TOTY: "TEAM OF THE YEAR",
  TOTS: "TEAM OF THE SEASON",
  TOTM: "STARS OF THE MONTH",
  SOTM: "STARS OF THE MONTH",
  BASE: "BASE",
  BA: "BASE",
  ICON: "ICONS",
  ICONS: "ICONS",
  ROOK: "ROOKIES",
  ROOKIES: "ROOKIES",
  FANT: "FANTASY HOCKEY",
  HUTC: "HUT CHAMPIONS",
  HBM: "HUT BEAST MODE",
  BEAST: "HUT BEAST MODE",
  GB: "HUT GAME BREAKERS",
  HH: "HUT HEROES",
  ODR: "HUT ODR SZN",
  MARQ: "MARQUEE",
  MILE: "MILESTONES",
  RB: "RECORD BREAKERS",
  SO: "SUPERSTAR ORIGINS",
  IG: "IGNITED",
  PIN: "PINNACLE",
  CAP: "CAPTAINS",
  CHASE: "CAPTAINS",
  CCAP: "CAPTAINS",
  CHCAP: "CAPTAINS",
  CN: "COMBO NEXUS",
  NEXUS: "COMBO NEXUS",
  FACEOFF: "FACEOFF: INSIDE THE NHL",
  FITN: "FACEOFF: INSIDE THE NHL",
  NG: "NEXT GEN",
  NXG: "NEXT GEN",
  NEXTGEN: "NEXT GEN",
  CMG: "CHECK MY GAME",
  GM: "GRUDGE MATCH",
  HRS: "HUT RANKED SEASONS",
  CHEL: "CHEL WEEK",
  ALUM: "ALUMNI",
  ALUMNI: "ALUMNI",
  FI: "FRESH ICE",
  PRO: "PROTOTYPES",
  PROTOTYPES: "PROTOTYPES",
  SPOT: "SPOTLIGHT",
  TQ: "TRADE QUEST",
  TRAN: "TRANSACTIONS",
  XP: "XP",
  NHL26: "26",
};

/** Seřazené podle českého názvu (pro &lt;select&gt;). */
export function hutdbTypyKaretVTriPoradi(): HutDbTypKarty[] {
  return [...RADKY].sort((a, b) =>
    a.jmenoCs.localeCompare(b.jmenoCs, "cs"),
  );
}

/** Typy s ikonou v pořadí podobném chemistry / `Bd` (mřížka Special Cards). */
export function hutdbTypyKaretProMrizku(): HutDbTypKarty[] {
  const podle = new Map(RADKY.map((r) => [r.hodnotaFiltru, r]));
  return PORADI_MRIZKY_CHEMISTRY.map((k) => podle.get(k)).filter(
    (r): r is HutDbTypKarty => r != null,
  );
}

export function urlLogaTypuKarty(comboSoubor: string | null): string | null {
  if (!comboSoubor) return null;
  const lokální = LOKALNI_TYPY_KARET[comboSoubor];
  if (lokální) return `/logos/hut-typy-karet/${lokální}`;
  return `${HUTDB_SUPABASE_PUBLIC_ASSETS}/combos/${comboSoubor}`;
}

/**
 * Vyhledá meta podle uložené hodnoty v `typKarty` (canonical filtr, zkratka, nebo český název).
 */
export function najdiMetaTypuKarty(ulozeno: string): HutDbTypKarty | null {
  const t = ulozeno.trim();
  if (!t) return null;

  const prim = t.toUpperCase();
  if (PODLE_FILTRU.has(prim)) return PODLE_FILTRU.get(prim)!;

  const presAlias = ALIAS_NA_FILTR[prim];
  if (presAlias && PODLE_FILTRU.has(presAlias))
    return PODLE_FILTRU.get(presAlias)!;

  const niz = t.toLowerCase();
  for (const r of RADKY) {
    if (r.jmenoCs.toLowerCase() === niz) return r;
  }

  return null;
}

/** Krátký text do řádku karty: český název, jinak původní řetězec. */
export function zobrazitelnyNazevTypuKarty(ulozeno: string): string {
  const m = najdiMetaTypuKarty(ulozeno);
  return m?.jmenoCs ?? (ulozeno.trim() || "—");
}
