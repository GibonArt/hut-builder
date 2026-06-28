/**
 * Rychlá kontrola bonus_kombinace_global po importu na NAS.
 * npm run over:kombinace-v-db
 */
import {
  nactiBonusKombinaceSdilene,
  type RadekBonusKombinaceUi,
} from "@/lib/bonusKombinaceDb";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname !== "/" ? u.pathname : ""}`;
  } catch {
    return "(neplatná URL)";
  }
}

function ukazka(radky: RadekBonusKombinaceUi[], n = 2): void {
  for (const r of radky.slice(0, n)) {
    process.stdout.write(
      `  - bonus ${r.bonusHodnota} ${r.bonusTyp}: ${r.param1.typ}, ${r.param2.typ}${r.param3?.typ ? `, ${r.param3.typ}` : ""}\n`,
    );
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!url) {
    throw new Error("Chybí NEXT_PUBLIC_SUPABASE_URL v .env");
  }
  process.stdout.write(`Supabase: ${maskUrl(url)}\n\n`);

  const supabase = createSupabaseServiceClient();
  const { utocna, obranna, error } = await nactiBonusKombinaceSdilene(supabase);
  if (error) throw error;

  process.stdout.write(`Kompletní řádky (po filtru aplikace):\n`);
  process.stdout.write(`  útok:   ${utocna.length}\n`);
  process.stdout.write(`  obrana: ${obranna.length}\n\n`);

  if (utocna.length > 0) {
    process.stdout.write("Ukázka útoku:\n");
    ukazka(utocna);
  } else {
    process.stdout.write(
      "Útok je prázdný — spusť znovu import po git pull (oprava nationality) a zkontroluj log „nových řádků útok“.\n",
    );
  }
  if (obranna.length > 0) {
    process.stdout.write("\nUkázka obrany:\n");
    ukazka(obranna);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
