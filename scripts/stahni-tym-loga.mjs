/**
 * Stáhne loga do public/logos/{LIGA}/{tymLogoSouborKlíč}.{ext} a zapíše lib/tymLogaManifest.json.
 * Synchronizuj seznamy týmů s lib/tymyPodleLigy.ts.
 * QMJHL: assets.leaguestat.com (stejné loga jako na https://chl.ca/lhjmq/en/teams/).
 * OHL: assets.leaguestat.com (ID z rosterů na https://chl.ca/ohl/teams/); Brampton jen 50×50.
 * WHL, ELH, SHL: SportsLogos.net — stránka týmu (list_by_team) + nejnovější Primary-Logo + full obrázek z view.
 *   WHL index: https://www.sportslogos.net/teams/list_by_league/11/.../WHL-Logos/
 *   ELH (117): https://www.sportslogos.net/teams/list_by_league/117/.../Czech_ELH/logos/
 *   SHL (94): https://www.sportslogos.net/teams/list_by_league/94/.../Sweden_SHL/logos/
 *
 * Liiga, DEL, NL, ICEHL, ECHL, HA (část týmů): SportsLogos.net (stejně jako WHL/ELH/SHL).
 * Liiga Tappara: po stažení GIF → PNG bez bílého pozadí (`scripts/odstran_bile_pozadi.py`, Pillow).
 * HC Ajoie: přímý náhled z Wikimedia Commons. Löwen Frankfurt: stejné logo jako Frankfurt Lions (SportsLogos).
 *
 * Spuštění: npm run loga
 * Jen jedna liga: ONLY_LIGA=WHL node scripts/stahni-tym-loga.mjs
 * (pro finskou Liiga použij ONLY_LIGA=LIIGA — název ligy se srovnává velkými písmeny.)
 * Slovenská extraliga + INT/WINT: ONLY_LIGA=SVK|INT|WINT
 *
 * Mezinárodní týmy INT: oficiální loga z blob.iihf.com (`…/mna/logos/{kód}_logo.png`), Finsko `fin_logo2018.png`.
 * WINT: vlajky z flagcdn.com + vlastní URL (Czechia) dle INT_CUSTOM_URL / WINT_CUSTOM_URL.
 * SVK: Wikimedia (HC Košice, HC Slovan); ostatní kluby dočasně vlajka SK (lze později nahradit klubovými logy).
 *
 * Mezi požadavky na SportsLogos: SLN_PAUSE_MS=600 (výchozí 500 ms).
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import {
  LIIGA,
  LIIGA_SLN,
  DEL_TEAMS,
  DEL_SLN,
  NL_TEAMS,
  NL_SLN,
  ICEHL_TEAMS,
  ICEHL_SLN,
  ECHL_TEAMS,
  ECHL_SLN,
  HA_SLN,
  NL_WIKIMEDIA_THUMB,
} from "./tym-loga-nove-ligy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_LOGOS = join(ROOT, "public/logos");
const MANIFEST_PATH = join(ROOT, "lib/tymLogaManifest.json");

const UA =
  "HUT-TeamLogos/1.0 (local roster tool; respectful crawl; low frequency)";

const SLN_BASE = "https://www.sportslogos.net";
const SLN_PAUSE_MS = Number(process.env.SLN_PAUSE_MS) || 500;

/** Stejné pravidlo jako lib/tymLogoKlic.ts (NFC + pomlčky, Unicode písmena). */
function tymLogoSouborKlíč(nazev) {
  const s = nazev.normalize("NFC").trim().toLowerCase();
  const slug = s
    .replace(/\//g, "-")
    .replace(/[^0-9\p{L}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tym";
}

const NHL_NA_ESPN = {
  "Anaheim Ducks": "ana",
  "Boston Bruins": "bos",
  "Buffalo Sabres": "buf",
  "Calgary Flames": "cgy",
  "Carolina Hurricanes": "car",
  "Chicago Blackhawks": "chi",
  "Colorado Avalanche": "col",
  "Columbus Blue Jackets": "cbj",
  "Dallas Stars": "dal",
  "Detroit Red Wings": "det",
  "Edmonton Oilers": "edm",
  "Florida Panthers": "fla",
  "Los Angeles Kings": "la",
  "Minnesota Wild": "min",
  "Montreal Canadiens": "mtl",
  "Nashville Predators": "nsh",
  "New Jersey Devils": "nj",
  "New York Islanders": "nyi",
  "New York Rangers": "nyr",
  "Ottawa Senators": "ott",
  "Philadelphia Flyers": "phi",
  "Pittsburgh Penguins": "pit",
  "San Jose Sharks": "sj",
  "Seattle Kraken": "sea",
  "St. Louis Blues": "stl",
  "Tampa Bay Lightning": "tb",
  "Toronto Maple Leafs": "tor",
  "Utah Mammoth": "uta",
  "Vancouver Canucks": "van",
  "Vegas Golden Knights": "vgk",
  "Washington Capitals": "wsh",
  "Winnipeg Jets": "wpg",
};

/** NHL týmy bez platného ESPN loga (např. historický franchise) — přímý asset SportsLogos. */
const NHL_CUSTOM_URL = {
  "Arizona Coyotes":
    "https://content.sportslogos.net/logos/1/23/full/phoenix_coyotes-primary_20048241.png",
};

/** ICEHL — oficiální web klubu místo SportsLogos. */
const ICEHL_CUSTOM_URL = {
  "HK Olimpija":
    "https://www.hkolimpija.si/wp-content/uploads/2025/10/hk_olimpija-logo-zelen.svg",
};

const PWHL_CLOUDINARY =
  "https://res.cloudinary.com/pwhl-low/image/upload";
const PWHL_NA_WEBU = {
  "Boston Fleet": `${PWHL_CLOUDINARY}/v1727726467/PWHL-BostonFleet-Primary-Logo-cropped_wcz9xj.svg`,
  "Minnesota Frost": `${PWHL_CLOUDINARY}/v1727723963/PWHL_Minnesota_Frost_Emblem_Primary_cmwh4l.svg`,
  "Montréal Victoire": `${PWHL_CLOUDINARY}/v1727726565/PWHL_Montreal_Victoire_Emblem_Primary-cropped_ptiglw.svg`,
  "New York Sirens": `${PWHL_CLOUDINARY}/v1727724085/PWHL_New_York_Sirens_Emblem_Primary_h60l54.svg`,
  "Ottawa Charge": `${PWHL_CLOUDINARY}/v1727724322/PWHL_Ottawa_Charge_Emblem_Primary_bnbixd.svg`,
  "Seattle Torrent": `${PWHL_CLOUDINARY}/v1762305836/SEA-t-11.4.25-logo-RGB-Lock-up-Primary_qhe8r8.png`,
  "Toronto Sceptres": `${PWHL_CLOUDINARY}/v1727724128/PWHL_Toronto_Sceptres_Emblem_Primary_qohlxz.svg`,
  "Vancouver Goldeneyes": `${PWHL_CLOUDINARY}/v1762302566/VAN-GE-11.4.25-Primary-logo.png`,
};

const AHL_WP = "https://theahl.com/wp-content/uploads/sites/3";
const AHL_NA_WEBU = {
  "Abbotsford Canucks": `${AHL_WP}/2021/07/abbotsford21_64-1.png`,
  "Bakersfield Condors": `${AHL_WP}/2022/07/bakersfield22_64.png`,
  "Belleville Senators": `${AHL_WP}/2019/09/belleville18_64-1.png`,
  "Bridgeport Islanders": `${AHL_WP}/2024/07/bridgeport24_64-1.png`,
  "Calgary Wranglers": `${AHL_WP}/2022/08/calgary22_64-1.png`,
  "Charlotte Checkers": `${AHL_WP}/2019/09/charlotte64-1.png`,
  "Chicago Wolves": `${AHL_WP}/2019/09/chicago64-1.png`,
  "Cleveland Monsters": `${AHL_WP}/2023/07/cleveland23_64-1.png`,
  "Coachella Valley Firebirds": `${AHL_WP}/2021/11/coachellavalley_64.png`,
  "Colorado Eagles": `${AHL_WP}/2022/07/colorado_64.png`,
  "Grand Rapids Griffins": `${AHL_WP}/2019/09/grandrapids64-1.png`,
  "Hartford Wolf Pack": `${AHL_WP}/2019/09/hartford64-1.png`,
  "Henderson Silver Knights": `${AHL_WP}/2020/05/henderson20_64.png`,
  "Hershey Bears": `${AHL_WP}/2019/09/hershey64-1.png`,
  "Iowa Wild": `${AHL_WP}/2019/09/iowa_word64-1.png`,
  "Laval Rocket": `${AHL_WP}/2019/09/laval64-1.png`,
  "Lehigh Valley Phantoms": `${AHL_WP}/2019/09/lv_64_dark.png`,
  "Manitoba Moose": `${AHL_WP}/2019/09/manitoba64-1.png`,
  "Milwaukee Admirals": `${AHL_WP}/2019/09/milwaukee64-1.png`,
  "Ontario Reign": `${AHL_WP}/2016/04/ontario64.png`,
  "Providence Bruins": `${AHL_WP}/2019/09/providence64_dark.png`,
  "Rochester Americans": `${AHL_WP}/2019/09/rochester64.png`,
  "Rockford IceHogs": `${AHL_WP}/2022/05/rockford22_64.png`,
  "San Diego Gulls": `${AHL_WP}/2016/04/sandiego64.png`,
  "San Jose Barracuda": `${AHL_WP}/2024/09/sanjose24_64.png`,
  "Springfield Thunderbirds": `${AHL_WP}/2022/03/springfield22_64.png`,
  "Syracuse Crunch": `${AHL_WP}/2019/09/syracuse64-1.png`,
  "Texas Stars": `${AHL_WP}/2019/09/texas64-1-1.png`,
  "Toronto Marlies": `${AHL_WP}/2019/09/toronto64_white.png`,
  "Tucson Roadrunners": `${AHL_WP}/2025/07/tucson25_64.png`,
  "Utica Comets": `${AHL_WP}/2021/05/utica21_64.png`,
  "Wilkes-Barre/Scranton Penguins": `${AHL_WP}/2019/09/wbs64.png`,
};

const NHL = [
  ...new Set([...Object.keys(NHL_NA_ESPN), ...Object.keys(NHL_CUSTOM_URL)]),
].sort((a, b) => a.localeCompare(b, "cs"));
const PWHL = Object.keys(PWHL_NA_WEBU).sort((a, b) => a.localeCompare(b, "cs"));
const AHL = Object.keys(AHL_NA_WEBU).sort((a, b) => a.localeCompare(b, "cs"));

const FLAGCDN_W160 = "https://flagcdn.com/w160";

/**
 * Oficiální loga národních výběrů z CDN IIHF (`blob.iihf.com`, cesta `…/mna/logos/`).
 * Většina souborů: `{kód}_logo.png` (3písmenný kód IIHF na blobu); výjimka Finsko — `fin_logo2018.png`.
 * Přepíše vlajky z flagcdn pro celou ligu INT.
 */
const IIHF_MNA_LOGOS =
  "https://blob.iihf.com/iihf-media/iihfmvc/media/contentimages/1_global/mna/logos";

/** Přímé URL — přepíše vlajku z flagcdn (INT). */
const INT_CUSTOM_URL = {
  Austria: `${IIHF_MNA_LOGOS}/aut_logo.png`,
  Belarus: `${IIHF_MNA_LOGOS}/blr_logo.png`,
  Canada: `${IIHF_MNA_LOGOS}/can_logo.png`,
  Czechia: `${IIHF_MNA_LOGOS}/cze_logo.png`,
  Denmark: `${IIHF_MNA_LOGOS}/den_logo.png`,
  Finland: `${IIHF_MNA_LOGOS}/fin_logo2018.png?width=145`,
  France: `${IIHF_MNA_LOGOS}/fra_logo.png`,
  Germany: `${IIHF_MNA_LOGOS}/ger_logo.png`,
  "Great Britain": `${IIHF_MNA_LOGOS}/gbr_logo.png`,
  Italy: `${IIHF_MNA_LOGOS}/ita_logo.png`,
  Japan: `${IIHF_MNA_LOGOS}/jpn_logo.png`,
  Kazakhstan: `${IIHF_MNA_LOGOS}/kaz_logo.png`,
  Latvia: `${IIHF_MNA_LOGOS}/lat_logo.png`,
  Norway: `${IIHF_MNA_LOGOS}/nor_logo.png`,
  Poland: `${IIHF_MNA_LOGOS}/pol_logo.png`,
  Russia: `${IIHF_MNA_LOGOS}/rus_logo.png`,
  Slovakia: `${IIHF_MNA_LOGOS}/svk_logo.png`,
  Sweden: `${IIHF_MNA_LOGOS}/swe_logo.png`,
  Switzerland: `${IIHF_MNA_LOGOS}/sui_logo.png`,
  Ukraine: `${IIHF_MNA_LOGOS}/ukr_logo.png`,
  USA: `${IIHF_MNA_LOGOS}/usa_logo.png`,
};

/** ISO 3166-1 alpha-2 — mužské národní týmy (INT). */
const INT_FLAG_KÓD = {
  Austria: "at",
  Belarus: "by",
  Canada: "ca",
  Czechia: "cz",
  Denmark: "dk",
  Finland: "fi",
  France: "fr",
  "Great Britain": "gb",
  Italy: "it",
  Japan: "jp",
  Kazakhstan: "kz",
  Latvia: "lv",
  Norway: "no",
  Poland: "pl",
  Russia: "ru",
  Slovakia: "sk",
  Sweden: "se",
  Switzerland: "ch",
  Ukraine: "ua",
  USA: "us",
  Germany: "de",
};

const INT_TÝMY = Object.keys(INT_FLAG_KÓD).sort((a, b) => a.localeCompare(b, "en"));

/** Ženské národní týmy (WINT / W-INT). */
/** Přímé URL — přepíše vlajku z flagcdn (WINT). */
const WINT_CUSTOM_URL = {
  Czechia:
    "https://content.sportslogos.net/logos/62/1650/full/3377__czech_republic-primary-2019.png",
};

const WINT_FLAG_KÓD = {
  Canada: "ca",
  Czechia: "cz",
  Denmark: "dk",
  Finland: "fi",
  France: "fr",
  Germany: "de",
  Hungary: "hu",
  Japan: "jp",
  Sweden: "se",
  Switzerland: "ch",
  USA: "us",
};

const WINT_TÝMY = Object.keys(WINT_FLAG_KÓD).sort((a, b) => a.localeCompare(b, "en"));

/** Tipsport liga (SK) — synchronizuj s lib/tymyPodleLigy.ts (`SVK`). */
const SVK_TÝMY = [
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

const SVK_NA_WEBU = {
  "HC Monacobet Banská Bystrica": `${FLAGCDN_W160}/sk.png`,
  "Vlci Žilina": `${FLAGCDN_W160}/sk.png`,
  "HK 32 Liptovský Mikuláš": `${FLAGCDN_W160}/sk.png`,
  "HC Košice": "https://upload.wikimedia.org/wikipedia/commons/8/82/HC_Ko%C5%A1ice.png",
  "HK Dukla Michalovce": `${FLAGCDN_W160}/sk.png`,
  "HK Nitra": `${FLAGCDN_W160}/sk.png`,
  "HC Prešov": `${FLAGCDN_W160}/sk.png`,
  "HK Poprad": `${FLAGCDN_W160}/sk.png`,
  "HK Dukla Trenčín": `${FLAGCDN_W160}/sk.png`,
  "HKM Zvolen": `${FLAGCDN_W160}/sk.png`,
  "HC Slovan Bratislava":
    "https://upload.wikimedia.org/wikipedia/en/a/af/HC_Slovan_Bratislava_logo.svg",
  "HK Spišská Nová Ves": `${FLAGCDN_W160}/sk.png`,
};

/**
 * QMJHL — LeagueStat CDN (odkazy z oficiální stránky týmů CHL / LHJMQ).
 * ID odpovídají rosterům /teams/{id} na chl.ca/lhjmq.
 */
const LS_QMJHL = "https://assets.leaguestat.com/lhjmq/logos";
const QMJHL_NA_WEBU = {
  "Baie-Comeau Drakkar": `${LS_QMJHL}/16.png`,
  "Blainville-Boisbriand Armada": `${LS_QMJHL}/19.png`,
  "Cape Breton Eagles": `${LS_QMJHL}/3.png`,
  "Charlottetown Islanders": `${LS_QMJHL}/7.png`,
  "Chicoutimi Saguenéens": `${LS_QMJHL}/10.png`,
  "Drummondville Voltigeurs": `${LS_QMJHL}/14_212.png`,
  "Gatineau Olympiques": `${LS_QMJHL}/12.png`,
  "Halifax Mooseheads": `${LS_QMJHL}/5_212.png`,
  "Moncton Wildcats": `${LS_QMJHL}/1.png`,
  "Newfoundland Regiment": `${LS_QMJHL}/2_212.png`,
  "Québec Remparts": `${LS_QMJHL}/9.png`,
  "Rimouski Océanic": `${LS_QMJHL}/18.png`,
  "Rouyn-Noranda Huskies": `${LS_QMJHL}/11.png`,
  "Saint John Sea Dogs": `${LS_QMJHL}/8.png`,
  "Shawinigan Cataractes": `${LS_QMJHL}/13.png`,
  "Sherbrooke Phoenix": `${LS_QMJHL}/60_212.png`,
  "Val-d'Or Foreurs": `${LS_QMJHL}/15.png`,
  "Victoriaville Tigres": `${LS_QMJHL}/17.png`,
};

const QMJHL = Object.keys(QMJHL_NA_WEBU).sort((a, b) => a.localeCompare(b, "cs"));

/**
 * OHL — LeagueStat CDN (ID z odkazů roster na chl.ca/ohl/teams/).
 * Brampton (18): plné logos/18.png vrací 404 — použito logos/50x50/18.png.
 */
const LS_OHL = "https://assets.leaguestat.com/ohl/logos";
const OHL_NA_WEBU = {
  "Barrie Colts": `${LS_OHL}/7.png`,
  "Brantford Bulldogs": `${LS_OHL}/1.png`,
  "Brampton Steelheads": `${LS_OHL}/50x50/18.png`,
  "Erie Otters": `${LS_OHL}/8.png`,
  "Flint Firebirds": `${LS_OHL}/13.png`,
  "Guelph Storm": `${LS_OHL}/9.png`,
  "Kingston Frontenacs": `${LS_OHL}/2.png`,
  "Kitchener Rangers": `${LS_OHL}/10.png`,
  "London Knights": `${LS_OHL}/14.png`,
  "Niagara IceDogs": `${LS_OHL}/20.png`,
  "North Bay Battalion": `${LS_OHL}/19.png`,
  "Oshawa Generals": `${LS_OHL}/4.png`,
  "Ottawa 67's": `${LS_OHL}/5.png`,
  "Owen Sound Attack": `${LS_OHL}/11.png`,
  "Peterborough Petes": `${LS_OHL}/6.png`,
  "Saginaw Spirit": `${LS_OHL}/34.png`,
  "Sarnia Sting": `${LS_OHL}/15.png`,
  "Soo Greyhounds": `${LS_OHL}/16.png`,
  "Sudbury Wolves": `${LS_OHL}/12.png`,
  "Windsor Spitfires": `${LS_OHL}/17.png`,
};

const OHL = Object.keys(OHL_NA_WEBU).sort((a, b) => a.localeCompare(b, "cs"));

/**
 * SportsLogos — cesta za …/logos/list_by_team/{cesta}/
 * WHL: https://www.sportslogos.net/teams/list_by_league/11/Western-Hockey-League-Logos/WHL-Logos/
 */
const WHL_SLN = {
  "Brandon Wheat Kings": "434/Brandon-Wheat-Kings-Logos",
  "Calgary Hitmen": "439/Calgary-Hitmen-Logos",
  "Edmonton Oil Kings": "2317/Edmonton-Oil-Kings-Logos",
  "Everett Silvertips": "449/Everett-Silvertips-Logos",
  "Kamloops Blazers": "444/Kamloops-Blazers-Logos",
  "Kelowna Rockets": "445/Kelowna-Rockets-Logos",
  "Lethbridge Hurricanes": "440/Lethbridge-Hurricanes-Logos",
  "Medicine Hat Tigers": "441/Medicine-Hat-Tigers-Logos",
  "Moose Jaw Warriors": "435/Moose-Jaw-Warriors-Logos",
  "Penticton Vees": "6948/Penticton-Vees-Logos",
  "Portland Winterhawks": "450/Portland-Winterhawks-Logos",
  "Prince Albert Raiders": "436/Prince-Albert-Raiders-Logos",
  "Prince George Cougars": "447/Prince-George-Cougars-Logos",
  "Red Deer Rebels": "442/Red-Deer-Rebels-Logos",
  "Regina Pats": "437/Regina-Pats-Logos",
  "Saskatoon Blades": "438/Saskatoon-Blades-Logos",
  "Seattle Thunderbirds": "451/Seattle-Thunderbirds-Logos",
  "Spokane Chiefs": "452/Spokane-Chiefs-Logos",
  "Swift Current Broncos": "443/Swift-Current-Broncos-Logos",
  "Tri-City Americans": "453/Tri-City-Americans-Logos",
  "Vancouver Giants": "448/Vancouver-Giants-Logos",
  "Victoria Royals": "3036/Victoria-Royals-Logos",
  "Wenatchee Wild": "6869/Wenatchee-Wild-Logos",
};

/** ELH — https://www.sportslogos.net/teams/list_by_league/117/.../Czech_ELH/logos/ */
const ELH_SLN = {
  "BK Mladá Boleslav": "3591/BK-Mlada-Boleslav-Logos",
  "Bílí Tygři Liberec": "3577/Bili-Tyg345i-Liberec-Logos",
  "HC Dynamo Pardubice": "5848/Dynamo-Pardubice-Logos",
  "HC Energie Karlovy Vary": "3573/Energie-Karlovy-Vary-Logos",
  "HC Kometa Brno": "3570/Kometa-Brno-Logos",
  "HC Olomouc": "5612/HC-Olomouc-Logos",
  "HC Oceláři Třinec": "3597/Ocela345i-T345inec-Logos",
  "HC Sparta Praha": "3608/Sparta-Praha-Logos",
  "HC Škoda Plzeň": "6543/HC-Skoda-Plzen-Logos",
  "HC Verva Litvínov": "3617/Verva-Litvinov-Logos",
  "HC Vítkovice Ridera": "6545/HC-Vitkovice-Ridera-Logos",
  "Motor České Budějovice": "3572/Mountfield-268eske-Bud283jovice-Logos",
  "Mountfield HK": "5611/Mountfield-HK-Logos",
  "Rytíři Kladno": "3576/Ryti345i-Kladno-Logos",
};

/** SHL — https://www.sportslogos.net/teams/list_by_league/94/.../Sweden_SHL/logos/ */
const SHL_SLN = {
  "Brynäs IF": "2865/Brynas-IF-Logos",
  "Djurgårdens IF": "2866/Djurgardens-IF-Logos",
  "Frölunda HC": "2911/Frolunda-Indians-Logos",
  "Färjestad BK": "2867/Farjestads-BK-Logos",
  HV71: "2868/HV71-Logos",
  "Leksands IF": "5068/Leksands-IF-Logos",
  "Linköping HC": "2869/Linkopings-HC-Logos",
  "Luleå HF": "2870/Lulea-HF-Logos",
  "Malmö Redhawks": "3017/Malmo-Redhawks-Logos",
  "Rögle BK": "3016/Rogle-BK-Logos",
  "Skellefteå AIK": "2872/Skelleftea-AIK-Logos",
  "Timrå IK": "2874/Timra-IK-Logos",
  "Växjö Lakers": "3509/Vaxjo-Lakers-Logos",
  "Örebro HK": "5067/Orebro-HK-Logos",
};

const WHL = [
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

const ELH = [
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

const SHL = [
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

function extFromType(ct, url) {
  const t = (ct || "").split(";")[0].trim().toLowerCase();
  if (t === "image/png") return "png";
  if (t === "image/svg+xml" || t === "image/svg") return "svg";
  if (t === "image/gif") return "gif";
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";
  if (t === "image/webp") return "webp";
  const m = url.match(/\.(png|svg|gif|jpe?g|webp)(?:\?|$)/i);
  if (m) return m[1].toLowerCase().replace("jpeg", "jpg");
  return "png";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Nejnovější Primary-Logo (podle roku v URL) na stránce list_by_team. */
function sportslogosPickPrimaryViewId(html) {
  const re = /href="\/logos\/view\/([^"]+)\/[^"]+\/(\d{4})\/Primary-Logo"/g;
  let bestYear = -1;
  let bestId = null;
  let m;
  while ((m = re.exec(html)) !== null) {
    const year = parseInt(m[2], 10);
    if (year > bestYear) {
      bestYear = year;
      bestId = m[1];
    }
  }
  return bestId;
}

/** Dekóduje &#345; a &amp; v URL z HTML SportsLogos. */
function decodeSportslogosUrl(u) {
  if (!u) return u;
  return u
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** První full obrázek z HTML stránky /logos/view/… (preferuje png, pak svg, gif, webp). */
function sportslogosPickFullAssetUrl(html) {
  const found = [];
  const seen = new Set();
  const re =
    /https:\/\/content\.sportslogos\.net\/logos\/\d+\/\d+\/full\/[^"'\s>]+\.(?:png|svg|gif|webp)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[0];
    if (!seen.has(u)) {
      seen.add(u);
      found.push(u);
    }
  }
  const pick = (ext) => found.find((u) => u.toLowerCase().endsWith(`.${ext}`));
  return pick("png") || pick("svg") || pick("gif") || pick("webp") || found[0] || null;
}

/** Záložní thumb (CDN často povolí thumb i když full PNG vrací 403). */
function sportslogosPickThumbUrl(html, viewId) {
  const esc = viewId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `https://content\\.sportslogos\\.net/logos/\\d+/\\d+/thumbs/${esc}\\.(?:gif|png)`,
    "i",
  );
  const m = html.match(re);
  return m ? m[0] : null;
}

async function sportslogosImageUrlAccessible(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": UA,
        Referer: `${SLN_BASE}/`,
      },
      redirect: "follow",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function stáhniText(url) {
  let lastErr = new Error("HTTP chyba");
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        Referer: `${SLN_BASE}/`,
      },
      redirect: "follow",
    });
    if (res.status === 429) {
      const ra = res.headers.get("retry-after");
      let sec = ra ? parseInt(ra, 10) : NaN;
      if (!Number.isFinite(sec)) sec = 45 + attempt * 20;
      process.stderr.write(` [429 SLN → čekám ${sec}s]`);
      await sleep(sec * 1000);
      lastErr = new Error("HTTP 429");
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }
  throw lastErr;
}

async function sportslogosPrimaryFullUrl(listPath) {
  const listUrl = `${SLN_BASE}/logos/list_by_team/${listPath}/`;
  const listHtml = await stáhniText(listUrl);
  const viewId = sportslogosPickPrimaryViewId(listHtml);
  if (!viewId) return null;
  const viewUrl = `${SLN_BASE}/logos/view/${encodeURIComponent(viewId)}`;
  const viewHtml = await stáhniText(viewUrl);
  const rawFull = sportslogosPickFullAssetUrl(viewHtml);
  const full = decodeSportslogosUrl(rawFull);
  if (full && (await sportslogosImageUrlAccessible(full))) return full;
  const thumb = sportslogosPickThumbUrl(viewHtml, viewId);
  if (thumb && (await sportslogosImageUrlAccessible(thumb))) return thumb;
  return full || thumb || null;
}

async function stáhni(url) {
  const headers = { "User-Agent": UA, Accept: "image/*,*/*" };
  if (url.includes("upload.wikimedia.org")) headers.Referer = "https://en.wikipedia.org/";
  if (url.includes("flagcdn.com")) headers.Referer = "https://flagcdn.com/";
  if (url.includes("content.sportslogos.net"))
    headers.Referer = `${SLN_BASE}/`;
  if (url.includes("hkolimpija.si")) headers.Referer = "https://www.hkolimpija.si/";
  if (url.includes("ishockey.dk")) headers.Referer = "https://ishockey.dk/";

  let lastErr = new Error("stahování selhalo");
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      headers,
      redirect: "follow",
    });
    if (res.status === 429) {
      const ra = res.headers.get("retry-after");
      let sec = ra ? parseInt(ra, 10) : NaN;
      if (!Number.isFinite(sec)) sec = 60 + attempt * 30;
      process.stderr.write(` [429 → čekám ${sec}s]`);
      await sleep(sec * 1000);
      lastErr = new Error("HTTP 429");
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80) throw new Error("příliš malý soubor");
    return { buf, type: res.headers.get("content-type") };
  }
  throw lastErr;
}

async function main() {
  const onlyLiga = process.env.ONLY_LIGA?.trim().toUpperCase();
  const want = (liga) => !onlyLiga || onlyLiga === liga.toUpperCase();

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

  const jobs = [];

  if (want("NHL")) {
    for (const t of NHL) {
      const custom = NHL_CUSTOM_URL[t];
      if (custom) {
        jobs.push({ liga: "NHL", tym: t, url: custom });
        continue;
      }
      const slug = NHL_NA_ESPN[t];
      if (slug)
        jobs.push({
          liga: "NHL",
          tym: t,
          url: `https://a.espncdn.com/i/teamlogos/nhl/500/${slug}.png`,
        });
    }
  }

  if (want("INT")) {
    for (const t of INT_TÝMY) {
      const custom = INT_CUSTOM_URL[t];
      if (custom) {
        jobs.push({ liga: "INT", tym: t, url: custom });
        continue;
      }
      const kód = INT_FLAG_KÓD[t];
      if (kód) jobs.push({ liga: "INT", tym: t, url: `${FLAGCDN_W160}/${kód}.png` });
    }
  }
  if (want("WINT")) {
    for (const t of WINT_TÝMY) {
      const custom = WINT_CUSTOM_URL[t];
      if (custom) {
        jobs.push({ liga: "WINT", tym: t, url: custom });
        continue;
      }
      const kód = WINT_FLAG_KÓD[t];
      if (kód) jobs.push({ liga: "WINT", tym: t, url: `${FLAGCDN_W160}/${kód}.png` });
    }
  }
  if (want("SVK")) {
    for (const t of SVK_TÝMY) {
      const url = SVK_NA_WEBU[t];
      if (url) jobs.push({ liga: "SVK", tym: t, url });
    }
  }

  if (want("PWHL")) {
    for (const t of PWHL) {
      const url = PWHL_NA_WEBU[t];
      if (url) jobs.push({ liga: "PWHL", tym: t, url });
    }
  }
  if (want("AHL")) {
    for (const t of AHL) {
      const url = AHL_NA_WEBU[t];
      if (url) jobs.push({ liga: "AHL", tym: t, url });
    }
  }
  if (want("QMJHL")) {
    for (const t of QMJHL) {
      const url = QMJHL_NA_WEBU[t];
      if (url) jobs.push({ liga: "QMJHL", tym: t, url });
    }
  }
  if (want("OHL")) {
    for (const t of OHL) {
      const url = OHL_NA_WEBU[t];
      if (url) jobs.push({ liga: "OHL", tym: t, url });
    }
  }

  async function přidejSportsLogos(liga, týmy, mapa) {
    if (!want(liga)) return;
    for (const t of týmy) {
      const listPath = mapa[t];
      if (!listPath) {
        process.stderr.write(`[${liga}] ${t}: chybí mapování SportsLogos ve skriptu\n`);
        await sleep(SLN_PAUSE_MS);
        continue;
      }
      try {
        const url = await sportslogosPrimaryFullUrl(listPath);
        if (!url) throw new Error("nenalezen Primary / full obrázek");
        jobs.push({ liga, tym: t, url });
      } catch (e) {
        process.stderr.write(`[${liga}] ${t}: SportsLogos — ${e.message}\n`);
      }
      await sleep(SLN_PAUSE_MS);
    }
  }

  await přidejSportsLogos("WHL", WHL, WHL_SLN);
  await přidejSportsLogos("ELH", ELH, ELH_SLN);
  await přidejSportsLogos("SHL", SHL, SHL_SLN);

  await přidejSportsLogos("Liiga", LIIGA, LIIGA_SLN);
  await přidejSportsLogos("DEL", DEL_TEAMS, DEL_SLN);
  await přidejSportsLogos("NL", NL_TEAMS.filter((t) => t !== "HC Ajoie"), NL_SLN);
  if (want("NL")) {
    for (const [tym, url] of Object.entries(NL_WIKIMEDIA_THUMB)) {
      jobs.push({ liga: "NL", tym, url });
    }
  }
  await přidejSportsLogos(
    "ICEHL",
    ICEHL_TEAMS.filter(
      (t) => !Object.prototype.hasOwnProperty.call(ICEHL_CUSTOM_URL, t),
    ),
    ICEHL_SLN,
  );
  if (want("ICEHL")) {
    for (const [tym, url] of Object.entries(ICEHL_CUSTOM_URL)) {
      jobs.push({ liga: "ICEHL", tym, url });
    }
  }
  await přidejSportsLogos("ECHL", ECHL_TEAMS, ECHL_SLN);

  await přidejSportsLogos("HA", Object.keys(HA_SLN), HA_SLN);

  let ok = 0;
  let fail = 0;
  let skip = 0;
  for (const { liga, tym, url } of jobs) {
    const dir = join(PUBLIC_LOGOS, liga);
    mkdirSync(dir, { recursive: true });
    const už = manifest[liga]?.[tym];
    if (už) {
      const p = join(dir, už);
      try {
        if (existsSync(p) && statSync(p).size > 80) {
          process.stderr.write(`${liga} / ${tym}… přeskočeno (už staženo)\n`);
          skip++;
          continue;
        }
      } catch {
        /* stáhnout znovu */
      }
    }
    const base = tymLogoSouborKlíč(tym);
    process.stderr.write(`${liga} / ${tym}… `);
    try {
      const { buf, type } = await stáhni(url);
      const ext = extFromType(type, url);
      let file = `${base}.${ext}`;
      const path = join(dir, file);
      writeFileSync(path, buf);
      if (liga === "Liiga" && tym === "Tappara") {
        const outPng = join(dir, `${base}.png`);
        execFileSync(
          "python3",
          [
            join(ROOT, "scripts", "odstran_bile_pozadi.py"),
            path,
            outPng,
            "--tolerance",
            "40",
          ],
          { stdio: "inherit" },
        );
        unlinkSync(path);
        file = `${base}.png`;
      }
      if (!manifest[liga]) manifest[liga] = {};
      manifest[liga][tym] = file;
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
      ok++;
      process.stderr.write(`OK → ${file}\n`);
    } catch (e) {
      fail++;
      process.stderr.write(`CHYBA: ${e.message}\n`);
    }
    let pauza = 180;
    if (url.includes("upload.wikimedia.org")) pauza = 3500;
    else if (url.includes("flagcdn.com")) pauza = 400;
    else if (url.includes("content.sportslogos.net") || url.includes("www.sportslogos.net"))
      pauza = SLN_PAUSE_MS;
    await sleep(pauza);
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  process.stderr.write(
    `\nHotovo: ${ok} nových, ${skip} přeskočeno, ${fail} chyb. Manifest: ${MANIFEST_PATH}\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
