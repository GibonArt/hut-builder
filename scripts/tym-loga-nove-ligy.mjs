/**
 * Seznamy týmů a mapování SportsLogos list_by_team/{id}/{slug}/
 * Musí odpovídat lib/tymyPodleLigy.ts (názvy týmů v UI).
 */

export const LIIGA = [
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

export const LIIGA_SLN = {
  Ässät: "2890/Assat-Logos",
  HIFK: "2877/Helsingfors-IFK-HIFK-Logos",
  HPK: "2879/HPK-Logos",
  Ilves: "2880/Ilves-Logos",
  JYP: "2882/JYP-Logos",
  Jukurit: "6341/Mikkelin-Jukurit-Logos",
  KalPa: "2883/Kalevan-Pallo-KalPa-Logos",
  KooKoo: "6340/KooKoo-Logos",
  Kärpät: "2884/Karpat-Logos",
  "Lahti Pelicans": "2886/Lahti-Pelicans-Logos",
  Lukko: "2885/Rauman-Lukko-Logos",
  SaiPa: "2887/Saimaan-Pallo-SaiPa-Logos",
  Sport: "5374/Vaasan-Sport-Logos",
  Tappara: "2888/Tappara-Logos",
  TPS: "2889/TPS-Turku-Logos",
};

export const DEL_TEAMS = [
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

/** Löwen Frankfurt: stejná franšíza jako Frankfurt Lions (SportsLogos). */
export const DEL_SLN = {
  "Adler Mannheim": "2901/Adler-Mannheim-Logos",
  "Augsburger Panther": "2892/Augsburger-Panther-Logos",
  "Düsseldorfer EG": "2894/Dusseldorfer-EG-Logos",
  "EHC Red Bull München": "5210/EHC-Red-Bull-Munchen-Logos",
  "Eisbären Berlin": "2893/Eisbaren-Berlin-Logos",
  "ERC Ingolstadt": "2897/ERC-Ingolstadt-Logos",
  "Fischtown Pinguins": "6614/Fischtown-Pinguins-Logos",
  "Grizzlys Wolfsburg": "5840/Grizzlys-Wolfsburg-Logos",
  "Iserlohn Roosters": "2898/Iserlohn-Roosters-Logos",
  "Kölner Haie": "2899/Kolner-Haie-Logos",
  "Krefeld Pinguine": "2900/Krefeld-Pinguine-Logos",
  "Nürnberg Ice Tigers": "2903/Thomas-Sabo-Ice-Tigers-Logos",
  "Schwenninger Wild Wings": "2902/Schwenninger-Wild-Wings-Logos",
  "Straubing Tigers": "2904/Straubing-Tigers-Logos",
  "Löwen Frankfurt": "2907/Frankfurt-Lions-Logos",
};

/** Přímý Commons náhled (pageimage) — spolehlivější než parsování HTML. */
export const NL_WIKIMEDIA_THUMB = {
  "HC Ajoie":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Hc_ajoie_logo.png/330px-Hc_ajoie_logo.png",
};

export const NL_TEAMS = [
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

/** Bez HC Ajoie — Wikipedia. */
export const NL_SLN = {
  "EHC Biel-Bienne": "3498/EHC-Biel-Logos",
  "EV Zug": "3505/EV-Zug-Logos",
  "Genève-Servette HC": "3500/Geneve-Servette-HC-Logos",
  "HC Ambrì-Piotta": "3496/HC-Ambri-Piotta-Logos",
  "HC Davos": "3501/HC-Davos-Logos",
  "HC Fribourg-Gottéron": "3499/HC-Fribourg-Gotteron-Logos",
  "HC Lugano": "3504/HC-Lugano-Logos",
  "Lausanne HC": "5211/Lausanne-HC-Logos",
  "SC Bern": "3497/SC-Bern-Logos",
  "SC Rapperswil-Jona Lakers": "3507/Rapperswil-Jona-Lakers-Logos",
  "SCL Tigers": "3503/SCL-Tigers-Logos",
  "ZSC Lions": "3506/ZSC-Lions-Logos",
  "EHC Kloten": "3502/Kloten-Flyers-Logos",
};

export const ICEHL_TEAMS = [
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

export const ICEHL_SLN = {
  "Bolzano Foxes": "5375/Bolzano-Bozen-Foxes-Logos",
  "Dornbirn Bulldogs": "4584/Dornbirner-EC-Logos",
  "EC KAC": "4587/EC-KAC-Logos",
  "EC Red Bull Salzburg": "4589/EC-Red-Bull-Salzburg-Logos",
  "EC VSV": "4592/EC-VSV-Logos",
  "EHC Black Wings Linz": "4588/EHC-Black-Wings-Linz-Logos",
  "Fehérvár AV19": "4593/SAPA-Fehervar-AV19-Logos",
  "Graz 99ers": "4585/Graz-99ers-Logos",
  "HC Innsbruck": "4586/HC-TWK-Innsbruck-Logos",
  "HC Orli Znojmo": "4595/Orli-Znojmo-Logos",
  "Vienna Capitals": "4591/Vienna-Capitals-Logos",
};

export const ECHL_TEAMS = [
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

export const ECHL_SLN = {
  "Adirondack Thunder": "5646/Adirondack-Thunder-Logos",
  "Allen Americans": "5474/Allen-Americans-Logos",
  "Atlanta Gladiators": "5868/Atlanta-Gladiators-Logos",
  "Bloomington Bison": "6906/Bloomington-Bison-Logos",
  "Cincinnati Cyclones": "1930/Cincinnati-Cyclones-Logos",
  "Florida Everblades": "1884/Florida-Everblades-Logos",
  "Fort Wayne Komets": "3950/Fort-Wayne-Komets-Logos",
  "Greensboro Gargoyles": "6929/Greensboro-Gargoyles-Logos",
  "Greenville Swamp Rabbits": "5849/Greenville-Swamp-Rabbits-Logos",
  "Idaho Steelheads": "1889/Idaho-Steelheads-Logos",
  "Indy Fuel": "5081/Indy-Fuel-Logos",
  "Iowa Heartlanders": "6786/Iowa-Heartlanders-Logos",
  "Jacksonville IceMen": "6458/Jacksonville-IceMen-Logos",
  "Kalamazoo Wings": "2785/Kalamazoo-Wings-Logos",
  "Kansas City Mavericks": "6518/Kansas-City-Mavericks-Logos",
  "Maine Mariners": "6553/Maine-Mariners-Logos",
  "Norfolk Admirals": "5785/Norfolk-Admirals-Logos",
  "Orlando Solar Bears": "3733/Orlando-Solar-Bears-Logos",
  "Rapid City Rush": "5471/Rapid-City-Rush-Logos",
  "Reading Royals": "1896/Reading-Royals-Logos",
  "Savannah Ghost Pirates": "6907/Savannah-Ghost-Pirates-Logos",
  "South Carolina Stingrays": "1899/South-Carolina-Sting-Rays-Logos",
  "Tahoe Knight Monsters": "6908/Tahoe-Knight-Monsters-Logos",
  "Toledo Walleye": "2783/Toledo-Walleye-Logos",
  "Trois-Rivières Lions": "6791/Trois-Rivieres-Lions-Logos",
  "Tulsa Oilers": "5469/Tulsa-Oilers-Logos",
  "Utah Grizzlies": "1908/Utah-Grizzlies-Logos",
  "Wheeling Nailers": "1918/Wheeling-Nailers-Logos",
  "Wichita Thunder": "5468/Wichita-Thunder-Logos",
  "Worcester Railers HC": "6016/Worcester-Railers-HC-Logos",
};

export const HA_TEAMS = [
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

/**
 * HockeyAllsvenskan — část týmů má stránku loga pod „Sweden SHL“ na SportsLogos
 * (historické / sdílené). Ostatní zatím bez lokálního loga → iniciály v UI.
 */
export const HA_SLN = {
  AIK: "2864/AIK-IF-Logos",
  "IF Björklöven": "3019/IF-Bjorkloven-Logos",
  "Modo Hockey": "2871/Modo-Hockey-Logos",
  "Mora IK": "3018/Mora-IK-Logos",
  "Södertälje SK": "2873/Sodertalje-SK-Logos",
  "Västerås IK": "3015/Vasteras-IK-Logos",
};
