import { NextResponse } from "next/server";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import {
  nactiHutbuilderSelectMeta,
  synchronizujHutbuilderKatalogStranku,
  type HutbuilderSelectMeta,
} from "@/lib/hutbuilderKatalogKaret";
import { hutbuilderConfigProSezonu } from "@/lib/hutbuilderSezonaConfig";
import { sezonaZSearchParams } from "@/lib/sezona";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";

/**
 * Jedna stránka syncu katalogu karet z Hut Builderu → `hutbuilder_katalog_karet`.
 * Nepatří do inventáře (`cards`). Query: `?sezona=&page=1&limit=40`
 */
export async function POST(req: Request) {
  const supabaseAuth = await createAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  const url = new URL(req.url);
  const sezona = sezonaZSearchParams(url.searchParams);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    80,
    Math.max(10, Number.parseInt(url.searchParams.get("limit") ?? "40", 10) || 40),
  );

  let adminDb;
  try {
    adminDb = createSupabaseServiceClient(sezona);
  } catch {
    return NextResponse.json(
      {
        error:
          sezona === "nhl27"
            ? "Chybí SUPABASE_NHL27_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_NHL27_URL."
            : "Chybí SUPABASE_SERVICE_ROLE_KEY v .env.",
      },
      { status: 500 },
    );
  }

  try {
    const probe = await adminDb.from("hutbuilder_katalog_karet").select("hb_id").limit(1);
    if (probe.error) {
      const msg = probe.error.message.toLowerCase();
      if (msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("could not find")) {
        return NextResponse.json(
          {
            error:
              "V databázi chybí tabulka hutbuilder_katalog_karet. Spusť v Supabase SQL Editoru soubor supabase/hutbuilder_katalog_karet.sql (stejný projekt jako tato sezóna) a zkus sync znovu.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: probe.error.message }, { status: 500 });
    }

    // Meta select-listů je levná; bere se pokaždé (stateless page sync).
    const meta: HutbuilderSelectMeta = await nactiHutbuilderSelectMeta(sezona);
    const vysledek = await synchronizujHutbuilderKatalogStranku(adminDb, {
      sezona,
      page,
      limit,
      concurrency: 6,
      meta,
    });

    const dbChyba = vysledek.chyby.find((c) => c.startsWith("DB upsert:"));
    if (dbChyba) {
      const low = dbChyba.toLowerCase();
      if (low.includes("schema cache") || low.includes("does not exist") || low.includes("could not find")) {
        return NextResponse.json(
          {
            error:
              "V databázi chybí tabulka hutbuilder_katalog_karet. Spusť supabase/hutbuilder_katalog_karet.sql a zkus sync znovu.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: dbChyba.replace(/^DB upsert:\s*/, "") }, { status: 500 });
    }

    const cfg = hutbuilderConfigProSezonu(sezona);
    return NextResponse.json({
      ...vysledek,
      // Meta mapy se do JSON neposílají (Map)
      meta: undefined,
      zdroj: cfg.cardsPageUrl,
      tabulka: "hutbuilder_katalog_karet",
      upozorneni:
        "Katalog Hut Builderu je oddělený od inventáře — karty se v Můj inventář / Moje karty nezobrazí.",
      hotovo: vysledek.page >= vysledek.totalPages || vysledek.naStrance === 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 502 },
    );
  }
}

/** Počet řádků v katalogu (kontrola po syncu). */
export async function GET(req: Request) {
  const supabaseAuth = await createAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  const sezona = sezonaZSearchParams(new URL(req.url).searchParams);
  let adminDb;
  try {
    adminDb = createSupabaseServiceClient(sezona);
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }

  const { count, error } = await adminDb
    .from("hutbuilder_katalog_karet")
    .select("hb_id", { count: "exact", head: true });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("could not find")) {
      return NextResponse.json(
        {
          error:
            "V databázi chybí tabulka hutbuilder_katalog_karet. Spusť supabase/hutbuilder_katalog_karet.sql v SQL Editoru.",
          pocet: 0,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: error.message, pocet: 0 }, { status: 500 });
  }

  return NextResponse.json({
    pocet: count ?? 0,
    tabulka: "hutbuilder_katalog_karet",
    upozorneni: "Odděleno od inventáře (public.cards).",
  });
}
