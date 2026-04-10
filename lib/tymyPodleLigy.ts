import type { Liga } from "@/types";
import NHLAA_RAW from "./nhlaaTymy.json";

/**
 * Týmy podle ligy — sezóna cca 2025/26 podle veřejných zdrojů a rozhraní NHL HUT Builder / hutdb
 * (NHL, NHLAA, PWHL, Liiga, SHL, HA, NL, DEL, ICEHL, ELH, slovenská Tipsport liga, INT / WINT, AHL, ECHL, CHL).
 * NHLAA: Alumni týmy jako na nhlhutbuilder.com (NHL21 cards.php, filtr League NHLAA).
 * Synchronizuj seznamy a loga se skriptem `npm run loga` (SportsLogos, ESPN, vlajky flagcdn, Wikimedia).
 * NHLAA loga: `npm run loga-nhlaa` (kopie z NHL + Commons u defunct franchise).
 */

const NHL: readonly string[] = [
  "Anaheim Ducks",
  "Arizona Coyotes",
  "Boston Bruins",
  "Buffalo Sabres",
  "Calgary Flames",
  "Carolina Hurricanes",
  "Chicago Blackhawks",
  "Colorado Avalanche",
  "Columbus Blue Jackets",
  "Dallas Stars",
  "Detroit Red Wings",
  "Edmonton Oilers",
  "Florida Panthers",
  "Los Angeles Kings",
  "Minnesota Wild",
  "Montreal Canadiens",
  "Nashville Predators",
  "New Jersey Devils",
  "New York Islanders",
  "New York Rangers",
  "Ottawa Senators",
  "Philadelphia Flyers",
  "Pittsburgh Penguins",
  "San Jose Sharks",
  "Seattle Kraken",
  "St. Louis Blues",
  "Tampa Bay Lightning",
  "Toronto Maple Leafs",
  "Utah Mammoth",
  "Vancouver Canucks",
  "Vegas Golden Knights",
  "Washington Capitals",
  "Winnipeg Jets",
].sort((a, b) => a.localeCompare(b, "cs"));

/** NHLAA — seznam v `lib/nhlaaTymy.json` (NHL21 HUT Builder / League NHLAA). */
const NHLAA: readonly string[] = [...NHLAA_RAW].sort((a, b) =>
  a.localeCompare(b, "cs"),
);

/**
 * PWHL (Professional Women’s Hockey League) — 8 týmů (2025–26).
 * Zdroj: thepwhl.com / Wikipedie (Boston, Minnesota, Montréal, New York, Ottawa, Toronto + Seattle, Vancouver).
 */
const PWHL: readonly string[] = [
  "Boston Fleet",
  "Minnesota Frost",
  "Montréal Victoire",
  "New York Sirens",
  "Ottawa Charge",
  "Seattle Torrent",
  "Toronto Sceptres",
  "Vancouver Goldeneyes",
].sort((a, b) => a.localeCompare(b, "cs"));

/** AHL — 32 týmů (2025–26). */
const AHL: readonly string[] = [
  "Abbotsford Canucks",
  "Bakersfield Condors",
  "Belleville Senators",
  "Bridgeport Islanders",
  "Calgary Wranglers",
  "Charlotte Checkers",
  "Chicago Wolves",
  "Cleveland Monsters",
  "Coachella Valley Firebirds",
  "Colorado Eagles",
  "Grand Rapids Griffins",
  "Hartford Wolf Pack",
  "Henderson Silver Knights",
  "Hershey Bears",
  "Iowa Wild",
  "Laval Rocket",
  "Lehigh Valley Phantoms",
  "Manitoba Moose",
  "Milwaukee Admirals",
  "Ontario Reign",
  "Providence Bruins",
  "Rochester Americans",
  "Rockford IceHogs",
  "San Diego Gulls",
  "San Jose Barracuda",
  "Springfield Thunderbirds",
  "Syracuse Crunch",
  "Texas Stars",
  "Toronto Marlies",
  "Tucson Roadrunners",
  "Utica Comets",
  "Wilkes-Barre/Scranton Penguins",
].sort((a, b) => a.localeCompare(b, "cs"));

/** QMJHL — 18 týmů (2025–26, vč. Newfoundland Regiment). */
const QMJHL: readonly string[] = [
  "Baie-Comeau Drakkar",
  "Blainville-Boisbriand Armada",
  "Cape Breton Eagles",
  "Charlottetown Islanders",
  "Chicoutimi Saguenéens",
  "Drummondville Voltigeurs",
  "Gatineau Olympiques",
  "Halifax Mooseheads",
  "Moncton Wildcats",
  "Newfoundland Regiment",
  "Québec Remparts",
  "Rimouski Océanic",
  "Rouyn-Noranda Huskies",
  "Saint John Sea Dogs",
  "Shawinigan Cataractes",
  "Sherbrooke Phoenix",
  "Val-d'Or Foreurs",
  "Victoriaville Tigres",
].sort((a, b) => a.localeCompare(b, "cs"));

/** OHL — 20 týmů (2025–26). */
const OHL: readonly string[] = [
  "Barrie Colts",
  "Brantford Bulldogs",
  "Brampton Steelheads",
  "Erie Otters",
  "Flint Firebirds",
  "Guelph Storm",
  "Kingston Frontenacs",
  "Kitchener Rangers",
  "London Knights",
  "Niagara IceDogs",
  "North Bay Battalion",
  "Oshawa Generals",
  "Ottawa 67's",
  "Owen Sound Attack",
  "Peterborough Petes",
  "Saginaw Spirit",
  "Sarnia Sting",
  "Soo Greyhounds",
  "Sudbury Wolves",
  "Windsor Spitfires",
].sort((a, b) => a.localeCompare(b, "cs"));

/** WHL — 23 týmů (2025–26, vč. Penticton Vees). */
const WHL: readonly string[] = [
  "Brandon Wheat Kings",
  "Calgary Hitmen",
  "Edmonton Oil Kings",
  "Everett Silvertips",
  "Kamloops Blazers",
  "Kelowna Rockets",
  "Lethbridge Hurricanes",
  "Medicine Hat Tigers",
  "Moose Jaw Warriors",
  "Penticton Vees",
  "Portland Winterhawks",
  "Prince Albert Raiders",
  "Prince George Cougars",
  "Red Deer Rebels",
  "Regina Pats",
  "Saskatoon Blades",
  "Seattle Thunderbirds",
  "Spokane Chiefs",
  "Swift Current Broncos",
  "Tri-City Americans",
  "Vancouver Giants",
  "Victoria Royals",
  "Wenatchee Wild",
].sort((a, b) => a.localeCompare(b, "cs"));

/** Tipsport extraliga (Česko) — 14 týmů (2025/26). */
const ELH: readonly string[] = [
  "BK Mladá Boleslav",
  "Bílí Tygři Liberec",
  "HC Dynamo Pardubice",
  "HC Energie Karlovy Vary",
  "HC Kometa Brno",
  "HC Olomouc",
  "HC Oceláři Třinec",
  "HC Sparta Praha",
  "HC Škoda Plzeň",
  "HC Verva Litvínov",
  "HC Vítkovice Ridera",
  "Motor České Budějovice",
  "Mountfield HK",
  "Rytíři Kladno",
].sort((a, b) => a.localeCompare(b, "cs"));

/**
 * Tipsport liga / slovenská extraliga — 12 týmů (2025/26).
 * Zdroj soupisky: sk.wikipedia „Tipsport liga 2025/2026“; názvy sponzorů (Monacobet) podle reality.
 */
const SVK: readonly string[] = [
  "HC Monacobet Banská Bystrica",
  "Vlci Žilina",
  "HK 32 Liptovský Mikuláš",
  "HC Košice",
  "HK Dukla Michalovce",
  "HK Nitra",
  "HC Prešov",
  "HK Poprad",
  "HK Dukla Trenčín",
  "HKM Zvolen",
  "HC Slovan Bratislava",
  "HK Spišská Nová Ves",
].sort((a, b) => a.localeCompare(b, "sk"));

/**
 * Mezinárodní mužské týmy (národní výběry) — shoda s rozhraním NHL HUT Builder / EA (`INT` na nhlhutbuilder.com).
 */
const INT: readonly string[] = [
  "Austria",
  "Belarus",
  "Canada",
  "Czechia",
  "Denmark",
  "Finland",
  "France",
  "Great Britain",
  "Italy",
  "Japan",
  "Kazakhstan",
  "Latvia",
  "Norway",
  "Poland",
  "Russia",
  "Slovakia",
  "Sweden",
  "Switzerland",
  "Ukraine",
  "USA",
  "Germany",
].sort((a, b) => a.localeCompare(b, "en"));

/**
 * Mezinárodní ženské týmy — shoda s `W-INT` na nhlhutbuilder.com.
 */
const WINT: readonly string[] = [
  "Canada",
  "Czechia",
  "Denmark",
  "Finland",
  "France",
  "Germany",
  "Hungary",
  "Japan",
  "Sweden",
  "Switzerland",
  "USA",
].sort((a, b) => a.localeCompare(b, "en"));

/** SHL (Švédsko) — 14 týmů (2025–26). */
const SHL: readonly string[] = [
  "Brynäs IF",
  "Djurgårdens IF",
  "Frölunda HC",
  "Färjestad BK",
  "HV71",
  "Leksands IF",
  "Linköping HC",
  "Luleå HF",
  "Malmö Redhawks",
  "Rögle BK",
  "Skellefteå AIK",
  "Timrå IK",
  "Växjö Lakers",
  "Örebro HK",
].sort((a, b) => a.localeCompare(b, "sv"));

/** Liiga (Finsko) — 15 týmů (2025–26). */
const LIIGA: readonly string[] = [
  "Ässät",
  "HIFK",
  "HPK",
  "Ilves",
  "JYP",
  "Jukurit",
  "KalPa",
  "KooKoo",
  "Kärpät",
  "Lahti Pelicans",
  "Lukko",
  "SaiPa",
  "Sport",
  "Tappara",
  "TPS",
].sort((a, b) => a.localeCompare(b, "fi"));

/** DEL (Německo) — 15 týmů (2025–26). */
const DEL: readonly string[] = [
  "Adler Mannheim",
  "Augsburger Panther",
  "Düsseldorfer EG",
  "EHC Red Bull München",
  "Eisbären Berlin",
  "ERC Ingolstadt",
  "Fischtown Pinguins",
  "Grizzlys Wolfsburg",
  "Iserlohn Roosters",
  "Kölner Haie",
  "Krefeld Pinguine",
  "Löwen Frankfurt",
  "Nürnberg Ice Tigers",
  "Schwenninger Wild Wings",
  "Straubing Tigers",
].sort((a, b) => a.localeCompare(b, "de"));

/** NL — National League (Švýcarsko), 14 týmů (2025–26). */
const NL: readonly string[] = [
  "EHC Biel-Bienne",
  "EV Zug",
  "Genève-Servette HC",
  "HC Ambrì-Piotta",
  "HC Ajoie",
  "HC Davos",
  "HC Fribourg-Gottéron",
  "HC Lugano",
  "Lausanne HC",
  "SC Bern",
  "SC Rapperswil-Jona Lakers",
  "SCL Tigers",
  "ZSC Lions",
  "EHC Kloten",
].sort((a, b) => a.localeCompare(b, "de"));

/** ICEHL — 12 týmů (2025–26). */
const ICEHL: readonly string[] = [
  "Bolzano Foxes",
  "Dornbirn Bulldogs",
  "EC KAC",
  "EC Red Bull Salzburg",
  "EC VSV",
  "EHC Black Wings Linz",
  "Fehérvár AV19",
  "Graz 99ers",
  "HC Innsbruck",
  "HK Olimpija",
  "HC Orli Znojmo",
  "Vienna Capitals",
].sort((a, b) => a.localeCompare(b, "de"));

/** ECHL — 30 týmů (2025–26). */
const ECHL: readonly string[] = [
  "Adirondack Thunder",
  "Allen Americans",
  "Atlanta Gladiators",
  "Bloomington Bison",
  "Cincinnati Cyclones",
  "Florida Everblades",
  "Fort Wayne Komets",
  "Greensboro Gargoyles",
  "Greenville Swamp Rabbits",
  "Idaho Steelheads",
  "Indy Fuel",
  "Iowa Heartlanders",
  "Jacksonville IceMen",
  "Kalamazoo Wings",
  "Kansas City Mavericks",
  "Maine Mariners",
  "Norfolk Admirals",
  "Orlando Solar Bears",
  "Rapid City Rush",
  "Reading Royals",
  "Savannah Ghost Pirates",
  "South Carolina Stingrays",
  "Tahoe Knight Monsters",
  "Toledo Walleye",
  "Trois-Rivières Lions",
  "Tulsa Oilers",
  "Utah Grizzlies",
  "Wheeling Nailers",
  "Wichita Thunder",
  "Worcester Railers HC",
].sort((a, b) => a.localeCompare(b, "en"));

/**
 * HockeyAllsvenskan (Švédsko) — 14 týmů (2025–26).
 * Loga: viz `HA_SLN` ve skriptu — u některých týmů zatím jen iniciály.
 */
const HA: readonly string[] = [
  "AIK",
  "Almtuna IS",
  "BIK Karlskoga",
  "IF Björklöven",
  "IK Oskarshamn",
  "IF Troja-Ljungby",
  "Kalmar HC",
  "Modo Hockey",
  "Mora IK",
  "Nybro Vikings",
  "Södertälje SK",
  "Vimmerby HC",
  "Västerås IK",
  "Östersunds IK",
].sort((a, b) => a.localeCompare(b, "sv"));

export const TYM_PER_LIGA: Readonly<Record<Liga, readonly string[]>> = {
  NHL,
  NHLAA,
  PWHL,
  Liiga: LIIGA,
  SHL,
  HA,
  NL,
  DEL,
  ICEHL,
  ELH,
  SVK,
  INT,
  WINT,
  AHL,
  ECHL,
  QMJHL,
  OHL,
  WHL,
};

/** České názvy lig ve formulářích (hodnota `value` zůstává kód `Liga`). */
export const LIGA_ZOBRAZENI: Readonly<Record<Liga, string>> = {
  NHL: "NHL",
  NHLAA: "NHLAA (Alumni — HUT Builder)",
  PWHL: "PWHL",
  Liiga: "Liiga (Finsko)",
  SHL: "SHL (Švédsko)",
  HA: "HockeyAllsvenskan",
  NL: "National League (Švýcarsko)",
  DEL: "DEL (Německo)",
  ICEHL: "ICEHL",
  ELH: "Tipsport extraliga (Česko)",
  SVK: "Tipsport liga (Slovensko)",
  INT: "Mezinárodní — muži (národní týmy)",
  WINT: "Mezinárodní — ženy (národní týmy)",
  AHL: "AHL",
  ECHL: "ECHL",
  QMJHL: "QMJHL",
  OHL: "OHL",
  WHL: "WHL",
};

/** Pořadí lig ve výběru (shoda s typem `Liga`). */
export const LIGY_V_PORADI: readonly Liga[] = [
  "NHL",
  "NHLAA",
  "PWHL",
  "Liiga",
  "SHL",
  "HA",
  "NL",
  "DEL",
  "ICEHL",
  "ELH",
  "SVK",
  "INT",
  "WINT",
  "AHL",
  "ECHL",
  "QMJHL",
  "OHL",
  "WHL",
];

/** Tým včetně ligy — pro vyhledávání napříč soutěžemi. */
export type TymVLize = { liga: Liga; tym: string };

/** Všechny týmy ze všech lig (jednou spočteno při načtení modulu). */
export const VSECHNY_TYMY_S_LIGOU: readonly TymVLize[] = LIGY_V_PORADI.flatMap(
  (liga) => TYM_PER_LIGA[liga].map((tym) => ({ liga, tym })),
);

/**
 * Filtruje týmy podle názvu napříč ligami (diakritika v datech; dotaz porovnáváme case-insensitive).
 * Shody začínající dotazem jsou výš, pak abecedně podle názvu.
 */
export function hledejTymyNapricLigami(dotaz: string, limit = 30): TymVLize[] {
  const q = dotaz.trim().toLowerCase();
  if (!q) return [];
  const matches = VSECHNY_TYMY_S_LIGOU.filter(({ tym }) =>
    tym.toLowerCase().includes(q),
  );
  matches.sort((a, b) => {
    const al = a.tym.toLowerCase();
    const bl = b.tym.toLowerCase();
    const aStart = al.startsWith(q) ? 0 : 1;
    const bStart = bl.startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    return a.tym.localeCompare(b.tym, "cs");
  });
  return matches.slice(0, limit);
}

/** Týmy pro vybranou ligu. */
export function tymyProLigu(liga: Liga): readonly string[] {
  return TYM_PER_LIGA[liga];
}
