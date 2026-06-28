import { NextResponse } from "next/server";
import { stahniKombinaceZChemistryCombos } from "@/lib/hutbuilderChemistryCombosHtml";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createClient } from "@/lib/supabase/server";

/** Stáhne a zparsuje Chemistry Combos z nhlhutbuilder.com (admin). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  try {
    const parsed = await stahniKombinaceZChemistryCombos(55_000);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 502 },
    );
  }
}
