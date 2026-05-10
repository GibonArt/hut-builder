import { NextResponse } from "next/server";
import {
  fetchHutbuilderLinesPage,
  type HutbuilderLineType,
} from "@/lib/hutbuilderGetLines";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createClient } from "@/lib/supabase/server";

function jeLineType(s: string | null): s is HutbuilderLineType {
  return s === "forwards" || s === "defense" || s === "goalie";
}

/** Proxy jedné stránky `get_lines.php` (admin). Klient volá ve smyčce kvůli limitům serverless. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  const url = new URL(req.url);
  const lineTypeRaw = url.searchParams.get("lineType");
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
  const timeoutMs = Math.min(
    90_000,
    Math.max(8000, Math.floor(Number(url.searchParams.get("timeoutMs")) || 55_000)),
  );

  if (!jeLineType(lineTypeRaw)) {
    return NextResponse.json(
      { error: 'Parametr lineType musí být „forwards“, „defense“ nebo „goalie“.' },
      { status: 400 },
    );
  }

  try {
    const data = await fetchHutbuilderLinesPage(lineTypeRaw, page, timeoutMs);
    if (data != null && typeof data === "object" && "error" in data && (data as { error?: boolean }).error) {
      const msg = (data as { message?: string }).message ?? "Chyba Hut Builder API";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 502 },
    );
  }
}
