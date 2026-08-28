import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";

/**
 * Smaže auth účet v Supabase (stejně jako hut-turnaj admin).
 * Vyžaduje SUPABASE_SERVICE_ROLE_KEY. Sdílená DB s turnajem — účet zmizí i pro turnaj.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const userId =
    typeof body === "object" &&
    body !== null &&
    "user_id" in body &&
    typeof (body as { user_id: unknown }).user_id === "string"
      ? (body as { user_id: string }).user_id.trim()
      : "";

  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: "Chybí platné user_id (UUID)." }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "Vlastní účet tímto způsobem smazat nelze." },
      { status: 400 },
    );
  }

  let serviceDb;
  try {
    serviceDb = createSupabaseServiceClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Chybí SUPABASE_SERVICE_ROLE_KEY v .env kontejneru — doplň z supabase-project/.env a restartuj hut.",
      },
      { status: 500 },
    );
  }

  const { data: target, error: getErr } = await serviceDb.auth.admin.getUserById(userId);
  if (getErr || !target.user) {
    return NextResponse.json(
      { error: getErr?.message ?? "Uživatel nenalezen." },
      { status: 404 },
    );
  }

  if (jeBonusAdmin(target.user.email)) {
    return NextResponse.json(
      { error: "Admin účet (gibonart@gmail.com) smazat nelze." },
      { status: 400 },
    );
  }

  const { error: delErr } = await serviceDb.auth.admin.deleteUser(userId);
  if (delErr) {
    return NextResponse.json(
      {
        error: `${delErr.message} — pokud účet používá hut-turnaj, může blokovat cizí FK v DB.`,
      },
      { status: 502 },
    );
  }

  revalidatePath("/admin/uzivatele");

  return NextResponse.json({
    ok: true,
    email: target.user.email ?? userId,
  });
}
