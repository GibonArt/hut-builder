/**
 * Jednorázový / opakovatelný skript: stáhne URL náhledů log z Wikipedie (parse API).
 * NHL neřeší — ta jdou přes ESPN CDN v kódu.
 * Spuštění: node scripts/build-tym-loga.mjs > lib/tymLogaWiki.json
 */
import https from "https";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const WIKI_OVERRIDES = {
  "Montréal Victoire": "Montreal Victoire",
  "Québec Remparts": "Québec Remparts",
  "Wilkes-Barre/Scranton Penguins": "Wilkes-Barre/Scranton Penguins",
  "Penticton Vees": "Penticton Vees (WHL)",
  "Newfoundland Regiment": "Newfoundland Regiment",
  "Mountfield HK": "Mountfield HK",
  "Motor České Budějovice": "Motor České Budějovice",
  "HC Škoda Plzeň": "HC Plzeň",
  "Rimouski Océanic": "Rimouski Océanic",
  "Chicoutimi Saguenéens": "Chicoutimi Saguenéens",
};

const TEAMS = [
  "Boston Fleet",
  "Minnesota Frost",
  "Montréal Victoire",
  "New York Sirens",
  "Ottawa Charge",
  "Seattle Torrent",
  "Toronto Sceptres",
  "Vancouver Goldeneyes",
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
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: { "User-Agent": "HUT-LogoBuilder/1.0 (educational; +local)" },
        },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => resolve(d));
        },
      )
      .on("error", reject);
  });
}

function pageTitle(team) {
  return WIKI_OVERRIDES[team] ?? team;
}

async function logoFromWiki(team) {
  const title = pageTitle(team);
  const api = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json`;
  let html;
  try {
    const raw = await get(api);
    const j = JSON.parse(raw);
    if (j.error) return null;
    html = j.parse?.text?.["*"];
  } catch {
    return null;
  }
  if (!html) return null;

  const re =
    /\/\/upload\.wikimedia\.org\/wikipedia\/[^"']+?\/thumb\/[^"']+?\.(?:png|svg)\/\d+px-[^"']+\.png/gi;
  const bad =
    /Commons-logo|Wikimedia-logo|Flag_of|Hockey_current_event|AHL-Uniform|NHL-Uniform|Referee|Ice_hockey_puck|Translation_to_english|medal_icon|Injury_icon/i;
  let m;
  const hits = [];
  while ((m = re.exec(html)) !== null) {
    const u = "https:" + m[0];
    if (!bad.test(u)) hits.push(u);
  }
  if (hits.length === 0) return null;
  const prefer = hits.find((u) => /logo/i.test(u) && !/Commons-logo/i.test(u));
  return prefer ?? hits[0];
}

async function main() {
  const out = {};
  let ok = 0;
  for (const t of TEAMS) {
    process.stderr.write(`${t}… `);
    const url = await logoFromWiki(t);
    if (url) {
      out[t] = url.replace(/\/\d+px-/, "/128px-");
      ok++;
      process.stderr.write("OK\n");
    } else {
      process.stderr.write("—\n");
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  const path = join(__dirname, "../lib/tymLogaWiki.json");
  writeFileSync(path, JSON.stringify(out, null, 2), "utf8");
  process.stderr.write(`\nUloženo ${path} (${ok}/${TEAMS.length}).\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
