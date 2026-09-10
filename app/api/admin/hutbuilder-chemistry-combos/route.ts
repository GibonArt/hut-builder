import { NextResponse } from "next/server";
import { stahniKombinaceZChemistryCombos } from "@/lib/hutbuilderChemistryCombosHtml";
import { hutbuilderConfigProSezonu } from "@/lib/hutbuilderSezonaConfig";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { sezonaZSearchParams } from "@/lib/sezona";
import { createAuthClient } from "@/lib/supabase/server";

/** Stáhne a zparsuje Chemistry Combos z nhlhutbuilder.com (admin). Query: `?sezona=`. */
export async function GET(req: Request) {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  const sezona = sezonaZSearchParams(new URL(req.url).searchParams);
  const cfg = hutbuilderConfigProSezonu(sezona);

  try {
    const parsed = await stahniKombinaceZChemistryCombos(55_000, sezona);
    return NextResponse.json({
      ...parsed,
      zdroj: cfg.chemistryCombosUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 502 },
    );
  }
}
