/**
 * Rychlá kontrola bonus_kombinace_global po importu na NAS.
 * npm run over:kombinace-v-db
 */
import {
  jeKompletniRadek,
  radkyZJsonb,
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

function pocetKompletnich(
  radky: RadekBonusKombinaceUi[],
  typ: "utocna" | "obranna",
): number {
  return radky.filter((r) => jeKompletniRadek(r, typ)).length;
}

function rozpadParametru(radky: RadekBonusKombinaceUi[], typ: "utocna" | "obranna"): string {
  const need = typ === "utocna" ? 3 : 2;
  const keys = new Map<string, number>();
  for (const r of radky) {
    if (!jeKompletniRadek(r, typ)) continue;
    const params = [r.param1, r.param2, ...(need === 3 ? [r.param3] : [])];
    const k = params.map((p) => p.typ).join("+");
    keys.set(k, (keys.get(k) ?? 0) + 1);
  }
  return [...keys.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k}: ${n}`)
    .join(", ");
}

function ukazka(radky: RadekBonusKombinaceUi[], n = 3): void {
  for (const r of radky.slice(0, n)) {
    const p3 =
      r.param3?.typ === "narodnost" && !r.param3.narodnostKod.trim()
        ? ""
        : r.param3
          ? `, ${r.param3.typ}`
          : "";
    process.stdout.write(
      `  - bonus ${r.bonusHodnota} ${r.bonusTyp}: ${r.param1.typ}, ${r.param2.typ}${p3}\n`,
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
  const { data, error } = await supabase
    .from("bonus_kombinace_global")
    .select("typ_kombinace, radky, updated_at");

  if (error) throw new Error(error.message);

  let utocnaRaw: RadekBonusKombinaceUi[] = [];
  let obrannaRaw: RadekBonusKombinaceUi[] = [];
  let updatedUt = "";
  let updatedOb = "";

  for (const row of data ?? []) {
    const parsed = radkyZJsonb(row.radky);
    if (row.typ_kombinace === "utocna") {
      utocnaRaw = parsed;
      updatedUt = row.updated_at ?? "";
    }
    if (row.typ_kombinace === "obranna") {
      obrannaRaw = parsed;
      updatedOb = row.updated_at ?? "";
    }
  }

  const utKompletni = pocetKompletnich(utocnaRaw, "utocna");
  const obKompletni = pocetKompletnich(obrannaRaw, "obranna");

  process.stdout.write("Raw JSONB (před filtrem aplikace):\n");
  process.stdout.write(`  útok:   ${utocnaRaw.length} (kompletních ${utKompletni})\n`);
  process.stdout.write(`  obrana: ${obrannaRaw.length} (kompletních ${obKompletni})\n`);
  if (updatedUt || updatedOb) {
    process.stdout.write(`  updated_at útok: ${updatedUt || "—"}, obrana: ${updatedOb || "—"}\n`);
  }
  process.stdout.write("\n");

  const { utocna, obranna, error: loadErr } = await nactiBonusKombinaceSdilene(supabase);
  if (loadErr) throw loadErr;

  process.stdout.write("Po filtru aplikace (co vidí optimalizátor):\n");
  process.stdout.write(`  útok:   ${utocna.length}\n`);
  process.stdout.write(`  obrana: ${obranna.length}\n\n`);

  process.stdout.write(`Rozpad útoku: ${rozpadParametru(utocnaRaw, "utocna") || "—"}\n`);
  process.stdout.write(`Rozpad obrany: ${rozpadParametru(obrannaRaw, "obranna") || "—"}\n\n`);

  if (utocna.length < 200) {
    process.stdout.write(
      "⚠ Málo útočných kombinací — spusť import Chemistry Combos:\n" +
        "  ./scripts/nas/02-import-kombinace.sh\n" +
        "  (očekává se ~280 útok / ~230 obrana z nhlhutbuilder.com/chemistry-combos.php)\n\n",
    );
  }

  if (utocna.length > 0) {
    process.stdout.write("Ukázka útoku:\n");
    ukazka(utocna);
  }
  if (obranna.length > 0) {
    process.stdout.write("\nUkázka obrany:\n");
    ukazka(obranna);
  }
  process.stdout.write("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
