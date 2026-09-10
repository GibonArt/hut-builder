import type { Sezona } from "@/lib/sezona";

const HUTBUILDER_ORIGIN = "https://nhlhutbuilder.com";

export type HutbuilderSezonaConfig = {
  sezona: Sezona;
  origin: string;
  /** Kořen sezóny na Hut Builderu (např. "" nebo "/NHL27"). */
  pathPrefix: string;
  chemistryCombosUrl: string;
  chemistryCombosReferer: string;
  comboFinderUrl: string;
  comboFinderReferer: string;
  getLinesUrl: string;
  cardLogosBase: string;
  xfactorIconsBase: string;
  builderUrl: string;
};

function cfg(
  sezona: Sezona,
  pathPrefix: string,
  chemistryRelative: string,
): HutbuilderSezonaConfig {
  const prefix = pathPrefix.replace(/\/$/, "");
  const base = `${HUTBUILDER_ORIGIN}${prefix}`;
  const chemistryCombosUrl = `${base}/${chemistryRelative}`.replace(
    /([^:]\/)\/+/g,
    "$1",
  );
  return {
    sezona,
    origin: HUTBUILDER_ORIGIN,
    pathPrefix: prefix,
    chemistryCombosUrl,
    chemistryCombosReferer: chemistryCombosUrl,
    comboFinderUrl: `${base}/combo-finder.php`.replace(/([^:]\/)\/+/g, "$1"),
    comboFinderReferer: `${base}/combo-finder.php`.replace(/([^:]\/)\/+/g, "$1"),
    getLinesUrl: `${HUTBUILDER_ORIGIN}/php/get_lines.php`,
    cardLogosBase: `${HUTBUILDER_ORIGIN}/images/card_logos`,
    xfactorIconsBase: `${HUTBUILDER_ORIGIN}/images/xfactor_icons/`,
    builderUrl:
      sezona === "nhl27"
        ? `${HUTBUILDER_ORIGIN}/NHL27/builder.php`
        : `${HUTBUILDER_ORIGIN}/NHL26/builder.php`,
  };
}

/**
 * Hut Builder URL per sezóna.
 * NHL26: stávající root stránky (chemistry-combos.php), které appka už používá.
 * NHL27: pod /NHL27/ (ověřeno: chemistry-combos.php vrací 200).
 * get_lines.php zůstává na rootu (sdílený endpoint); referer sezóny v hlavičkách.
 */
const CONFIG: Record<Sezona, HutbuilderSezonaConfig> = {
  nhl26: cfg("nhl26", "", "chemistry-combos.php"),
  nhl27: cfg("nhl27", "/NHL27", "chemistry-combos.php"),
};

export function hutbuilderConfigProSezonu(sezona: Sezona): HutbuilderSezonaConfig {
  return CONFIG[sezona];
}
