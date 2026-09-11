import { NextResponse } from "next/server";
import {
  deduplikujPayloadBonusu,
  ulozBonusKombinaciSdilenou,
  type RadekBonusKombinaceUi,
} from "@/lib/bonusKombinaceDb";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { sezonaZSearchParams } from "@/lib/sezona";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";

type Body = {
  utocna?: RadekBonusKombinaceUi[];
  obranna?: RadekBonusKombinaceUi[];
};

/**
 * Uloží sdílené bonus kombinace přes service role (obejde RLS).
 * Prohlížeč → NHL27 PostgREST často jde jako `anon` (Auth je na NHL26),
 * takže přímý upsert z klienta padá na RLS i pro admina.
 * Query: `?sezona=nhl26|nhl27`
 */
export async function POST(req: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  const sezona = sezonaZSearchParams(new URL(req.url).searchParams);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Neplatné JSON tělo." }, { status: 400 });
  }

  const deduped = deduplikujPayloadBonusu({
    utocna: Array.isArray(body.utocna) ? body.utocna : [],
    obranna: Array.isArray(body.obranna) ? body.obranna : [],
  });

  let adminDb;
  try {
    adminDb = createSupabaseServiceClient(sezona);
  } catch {
    return NextResponse.json(
      {
        error:
          sezona === "nhl27"
            ? "Chybí SUPABASE_NHL27_SERVICE_ROLE_KEY a URL NHL27."
            : "Chybí SUPABASE_SERVICE_ROLE_KEY v .env kontejneru.",
      },
      { status: 500 },
    );
  }

  const u = await ulozBonusKombinaciSdilenou(
    adminDb,
    user.id,
    "utocna",
    deduped.utocna,
  );
  if (u.error) {
    return NextResponse.json({ error: u.error.message }, { status: 500 });
  }
  const o = await ulozBonusKombinaciSdilenou(
    adminDb,
    user.id,
    "obranna",
    deduped.obranna,
  );
  if (o.error) {
    return NextResponse.json({ error: o.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sezona,
    utocna: deduped.utocna.length,
    obranna: deduped.obranna.length,
  });
}
