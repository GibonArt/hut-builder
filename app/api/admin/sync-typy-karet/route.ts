import { NextResponse } from "next/server";
import { upsertDynamickeTypyKaret } from "@/lib/hutdbTypKaretDynamicDb";
import {
  dynamicRadkyZHutbuilderTypuKaret,
  noveTypyOprotiStatickemuKatalogu,
  stahniHutbuilderSelectListCardTypes,
} from "@/lib/hutdbTypKaretSync";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { hutbuilderConfigProSezonu } from "@/lib/hutbuilderSezonaConfig";
import { sezonaZSearchParams } from "@/lib/sezona";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";

async function stahniHutbuilderHtml(
  url: string,
  referer: string,
): Promise<{ ok: true; html: string } | { ok: false; status?: number; error: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "HUT-App/1.0 (admin sync card types; same page as hutbuilder)",
        Referer: referer,
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
      return {
        ok: false,
        status: res.status,
        error: `Hut Builder HTTP ${res.status} (${url})`,
      };
    }
    return { ok: true, html: await res.text() };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e) };
  }
}

/**
 * Stáhne Combo Finder + Chemistry Combos + AJAX select-list, sloučí typy karet
 * a upsertne do `hut_typy_karet_dynamic`. Query: `?sezona=nhl26|nhl27`
 */
export async function POST(req: Request) {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  const sezona = sezonaZSearchParams(new URL(req.url).searchParams);
  const cfg = hutbuilderConfigProSezonu(sezona);

  let adminDb;
  try {
    adminDb = createSupabaseServiceClient(sezona);
  } catch {
    return NextResponse.json(
      {
        error:
          sezona === "nhl27"
            ? "Chybí SUPABASE_NHL27_SERVICE_ROLE_KEY (nebo fallback SUPABASE_SERVICE_ROLE_KEY) a NEXT_PUBLIC_SUPABASE_NHL27_URL."
            : "Chybí SUPABASE_SERVICE_ROLE_KEY v .env kontejneru — doplň z supabase-project/.env a restartuj hut.",
      },
      { status: 500 },
    );
  }

  const [comboRes, chemRes, selectList] = await Promise.all([
    stahniHutbuilderHtml(cfg.comboFinderUrl, cfg.comboFinderReferer),
    stahniHutbuilderHtml(cfg.chemistryCombosUrl, cfg.chemistryCombosReferer),
    stahniHutbuilderSelectListCardTypes(cfg.selectListUrl, cfg.chemistryCombosReferer).catch(
      () => null,
    ),
  ]);

  if (!comboRes.ok && !chemRes.ok && !selectList?.length) {
    const err =
      (!comboRes.ok && comboRes.error) ||
      (!chemRes.ok && chemRes.error) ||
      "Select-list nevrátil žádné typy.";
    return NextResponse.json({ error: err }, { status: 502 });
  }

  const chemistryHtml = chemRes.ok ? chemRes.html : null;
  const comboFinderHtml = comboRes.ok ? comboRes.html : null;
  const rows = dynamicRadkyZHutbuilderTypuKaret({
    comboFinderHtml,
    chemistryHtml,
    selectListItems: selectList,
  });
  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nepodařilo se načíst typy karet z Hut Builderu (HTML ani select-list). Zkus znovu později.",
      },
      { status: 422 },
    );
  }

  const { data: existujiciRadky, error: chybaExistujicich } = await adminDb
    .from("hut_typy_karet_dynamic")
    .select("hodnota_filtru");
  if (chybaExistujicich) {
    return NextResponse.json(
      {
        error: `${chybaExistujicich.message} — zkontroluj tabulku hut_typy_karet_dynamic a RLS.`,
      },
      { status: 500 },
    );
  }
  const existujiciKlice = new Set(
    (existujiciRadky ?? []).map((r) =>
      String((r as { hodnota_filtru?: string }).hodnota_filtru ?? "").trim().toUpperCase(),
    ),
  );
  let novychVDb = 0;
  for (const r of rows) {
    const k = r.hodnota_filtru.trim().toUpperCase();
    if (!existujiciKlice.has(k)) novychVDb += 1;
  }
  const aktualizovano = rows.length - novychVDb;

  const syncedAt = new Date().toISOString();
  const { error, schema_varovani } = await upsertDynamickeTypyKaret(adminDb, rows, syncedAt);

  if (error) {
    return NextResponse.json(
      {
        error: `${error} — pokud tabulka neexistuje, spusť SQL „hut_typy_karet_dynamic.sql“ v Supabase.`,
      },
      { status: 500 },
    );
  }

  const noveVKatalogu = noveTypyOprotiStatickemuKatalogu(rows);
  const zdroje = [
    ...(comboFinderHtml ? [cfg.comboFinderUrl] : []),
    ...(chemistryHtml ? [cfg.chemistryCombosUrl] : []),
    ...(selectList?.length ? [cfg.selectListUrl] : []),
  ];

  return NextResponse.json({
    ok: true,
    sezona,
    zdroj: zdroje[0] ?? cfg.comboFinderUrl,
    zdroje,
    chemistry_ok: Boolean(chemistryHtml),
    select_list_ok: Boolean(selectList?.length),
    /** Počet unikátních typů vyparsovaných ze zdrojů (řádků k upsertu). */
    pocet: rows.length,
    /** Řádky s `hodnota_filtru`, které v DB před syncem nebyly → INSERT při upsertu. */
    novych_v_db: novychVDb,
    /** Řádky, jejichž klíč už v DB byl → UPDATE `jmeno_cs`, `combo_soubor`, `synced_at`. */
    aktualizovano,
    /** Nové oproti statickému katalogu v kódu — po syncu hned v dropdownu (Supabase + sloučení). */
    nove_v_katalogu: noveVKatalogu.map((r) => ({
      hodnota_filtru: r.hodnota_filtru,
      jmeno_cs: r.jmeno_cs,
      combo_soubor: r.combo_soubor,
    })),
    synced_at: syncedAt,
    schema_varovani,
  });
}
