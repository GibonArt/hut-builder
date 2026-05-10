import { NextResponse } from "next/server";
import { dynamicRadkyZComboFinderHtml } from "@/lib/hutbuilderBonusImport";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { HUTBUILDER_COMBO_FINDER_REFERER } from "@/lib/hutbuilderGetLines";
import { createClient } from "@/lib/supabase/server";

const COMBO_FINDER = "https://nhlhutbuilder.com/combo-finder.php";

/**
 * Stáhne combo-finder HTML, vyparsuje typy karet a upsertne je do `hut_typy_karet_dynamic`.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  let html: string;
  try {
    const res = await fetch(COMBO_FINDER, {
      headers: {
        "User-Agent":
          "HUT-App/1.0 (admin sync card types; same page as combo-finder)",
        Referer: HUTBUILDER_COMBO_FINDER_REFERER,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
      signal:
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(55_000)
          : undefined,
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Hut Builder HTTP ${res.status}` },
        { status: 502 },
      );
    }
    html = await res.text();
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 502 },
    );
  }

  const rows = dynamicRadkyZComboFinderHtml(html);
  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "V HTML se nepodařilo najít žádný typ karet (změnil se markup?). Zkus znovu později.",
      },
      { status: 422 },
    );
  }

  const syncedAt = new Date().toISOString();
  const { error } = await supabase.from("hut_typy_karet_dynamic").upsert(
    rows.map((r) => ({ ...r, synced_at: syncedAt })),
    { onConflict: "hodnota_filtru" },
  );

  if (error) {
    return NextResponse.json(
      {
        error: `${error.message} — pokud tabulka neexistuje, spusť SQL „hut_typy_karet_dynamic.sql“ v Supabase.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, pocet: rows.length, synced_at: syncedAt });
}
