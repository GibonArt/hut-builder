import type { RadekBonusKombinaceUi } from "@/lib/bonusKombinaceDb";
import {
  radkyZRadekHutbuilder,
  type HutbuilderImportedLine,
} from "@/lib/hutbuilderBonusImport";
import {
  fetchHutbuilderLinesPage,
  HUTBUILDER_CLI_DEFAULT_TIMEOUT_MS,
  type HutbuilderLineType,
} from "@/lib/hutbuilderGetLines";

export type HutbuilderImportPruchod = {
  optimizeFor: string | null;
  timeoutMs: number;
  popisek: string;
};

export const VYCHOZI_PRUCHODY_IMPORTU: HutbuilderImportPruchod[] = [
  {
    optimizeFor: null,
    timeoutMs: HUTBUILDER_CLI_DEFAULT_TIMEOUT_MS,
    popisek: "žebříček",
  },
  {
    optimizeFor: "overall",
    timeoutMs: HUTBUILDER_CLI_DEFAULT_TIMEOUT_MS,
    popisek: "overall (CLK)",
  },
];

const LINE_TYPES: HutbuilderLineType[] = ["forwards", "defense", "goalie"];

/** Po tolika po sobě jdoucích stránkách bez nového line_id ukončíme průchod (API někdy opakuje stejné řádky). */
const MAX_STRANEK_JEN_DUPLICITY = 3;

export type HutbuilderStazeneKombinace = {
  noveUt: RadekBonusKombinaceUi[];
  noveOb: RadekBonusKombinaceUi[];
  /** Počet unikátních line_id napříč všemi průchody (informativní). */
  unikatnichLineId: number;
  /** Kolik HTTP stránek Hut Builderu se stáhlo. */
  stazenychStranek: number;
};

export type StahniKombinaceOpts = {
  pruchody?: HutbuilderImportPruchod[];
  delayMs?: number;
  maxPages?: number;
  onLog?: (msg: string) => void;
  shouldAbort?: () => boolean;
  /** true = přes Next.js proxy; výchozí false = přímý fetch z NAS/CLI. */
  presProxy?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jeChunk(obj: unknown): obj is {
  lines?: unknown[];
  per_page?: number;
  has_more?: boolean;
} {
  return obj != null && typeof obj === "object";
}

/**
 * Stejná smyčka jako tlačítko v Nastavení bonusů — stahuje Hut Builder po stránkách
 * a mapuje chemie na řádky PLAT / BS / CLK.
 */
export async function stahniKombinaceZHutbuilder(
  opts?: StahniKombinaceOpts,
): Promise<HutbuilderStazeneKombinace> {
  const pruchody = opts?.pruchody ?? VYCHOZI_PRUCHODY_IMPORTU;
  const delayMs = opts?.delayMs ?? 280;
  const maxPages = opts?.maxPages ?? 650;
  const presProxy = opts?.presProxy === true;
  const log = opts?.onLog ?? (() => {});

  const noveUt: RadekBonusKombinaceUi[] = [];
  const noveOb: RadekBonusKombinaceUi[] = [];
  const vsechnaLineId = new Set<number>();
  let stazenychStranek = 0;

  for (const lt of LINE_TYPES) {
    for (const pr of pruchody) {
      let page = 1;
      let perPage = 20;
      const seenLineIds = new Set<number>();
      let strankyJenDuplicity = 0;

      for (;;) {
        if (opts?.shouldAbort?.()) {
          throw new Error("Import přerušen (shouldAbort).");
        }

        log(`${lt} — ${pr.popisek} — stránka ${page} (stahuji…)`);

        const raw = await fetchHutbuilderLinesPage(lt, page, pr.timeoutMs, {
          optimizeFor: pr.optimizeFor,
          retries: 4,
          presProxy,
        });
        stazenychStranek += 1;

        if (!jeChunk(raw)) {
          throw new Error(`Neplatná odpověď Hut Builder (${lt}, stránka ${page}).`);
        }

        if (
          raw != null &&
          typeof raw === "object" &&
          "error" in raw &&
          (raw as { error?: boolean }).error
        ) {
          const msg = (raw as { message?: string }).message ?? "Chyba Hut Builder API";
          throw new Error(msg);
        }

        const lines = Array.isArray(raw.lines) ? raw.lines : [];
        if (lines.length === 0) break;

        if (typeof raw.per_page === "number") perPage = raw.per_page;

        let zpracovanoRadku = 0;
        for (const row of lines) {
          const line = row as { line_id?: number };
          const lid = line.line_id;
          if (lid != null && seenLineIds.has(lid)) continue;
          if (lid != null) {
            seenLineIds.add(lid);
            vsechnaLineId.add(lid);
          }
          zpracovanoRadku += 1;
          const { utocna: u, obranna: o } = radkyZRadekHutbuilder(
            row as HutbuilderImportedLine,
          );
          noveUt.push(...u);
          noveOb.push(...o);
        }

        log(
          `${lt} — ${pr.popisek} — stránka ${page} (${zpracovanoRadku} nových řádků API / ${seenLineIds.size} unikát. line_id v průchodu)`,
        );

        if (zpracovanoRadku === 0) {
          strankyJenDuplicity += 1;
          log(
            `${lt} — ${pr.popisek} — stránka ${page} bez nového line_id (${strankyJenDuplicity}/${MAX_STRANEK_JEN_DUPLICITY})`,
          );
          if (strankyJenDuplicity >= MAX_STRANEK_JEN_DUPLICITY) break;
        } else {
          strankyJenDuplicity = 0;
        }

        if (raw.has_more === false) break;
        if (lines.length < perPage) break;

        page += 1;
        if (page > maxPages) break;
        if (delayMs > 0) await sleep(delayMs);
      }
    }
  }

  return {
    noveUt,
    noveOb,
    unikatnichLineId: vsechnaLineId.size,
    stazenychStranek,
  };
}
