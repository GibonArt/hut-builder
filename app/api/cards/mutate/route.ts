import { NextResponse } from "next/server";
import {
  aktualizujKartu,
  smazKartuPodleSlug,
  vlozKartu,
} from "@/lib/cardsDb";
import { sezonaZSearchParams, type Sezona } from "@/lib/sezona";
import { dataSupabaseEnvServer } from "@/lib/supabase/env";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";
import type { HutCard } from "@/types";

type Body = {
  action?: "insert" | "update" | "delete";
  card?: HutCard;
  cardSlug?: string;
  puvodniKarta?: HutCard | null;
};

function dataCilDebug(sezona: Sezona) {
  try {
    const u = new URL(dataSupabaseEnvServer(sezona).url);
    return { sezona, dataHost: u.host, dataOrigin: u.origin };
  } catch {
    return { sezona, dataHost: null as string | null, dataOrigin: null as string | null };
  }
}

function chybaOdpoved(sezona: Sezona, message: string, status: number) {
  const debug = dataCilDebug(sezona);
  const fkHint =
    /foreign key|cards_user_id_fkey/i.test(message) && debug.dataHost
      ? ` Zápis jde na ${debug.dataHost} — na tomhle Postgresu dropni cards_user_id_fkey (./scripts/nas/04-fix-nhl27-auth-fks.sh).`
      : "";
  return NextResponse.json(
    { error: `${message}${fkHint}`, ...debug },
    { status },
  );
}

/**
 * Zápis karet přes service role (obejde RLS).
 * Query: `?sezona=nhl26|nhl27`
 */
export async function POST(req: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Nejsi přihlášen." }, { status: 401 });
  }

  const sezona = sezonaZSearchParams(new URL(req.url).searchParams);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Neplatné JSON tělo." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "insert" && action !== "update" && action !== "delete") {
    return NextResponse.json({ error: "Neplatná action." }, { status: 400 });
  }

  let adminDb;
  try {
    adminDb = createSupabaseServiceClient(sezona);
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }

  if (action === "delete") {
    const slug = body.cardSlug?.trim();
    if (!slug) {
      return NextResponse.json({ error: "Chybí cardSlug." }, { status: 400 });
    }
    const { error } = await smazKartuPodleSlug(adminDb, user.id, slug);
    if (error) return chybaOdpoved(sezona, error.message, 500);
    return NextResponse.json({ ok: true, ...dataCilDebug(sezona), action });
  }

  if (!body.card || typeof body.card !== "object") {
    return NextResponse.json({ error: "Chybí card." }, { status: 400 });
  }

  if (action === "insert") {
    const { error } = await vlozKartu(adminDb, user.id, body.card);
    if (error) {
      const status = error.message.includes("stejnými údaji") ? 409 : 500;
      return chybaOdpoved(sezona, error.message, status);
    }
    return NextResponse.json({ ok: true, ...dataCilDebug(sezona), action });
  }

  const slug = body.cardSlug?.trim() || body.card.id;
  if (!slug) {
    return NextResponse.json({ error: "Chybí cardSlug." }, { status: 400 });
  }
  const { error } = await aktualizujKartu(
    adminDb,
    user.id,
    slug,
    body.card,
    body.puvodniKarta ?? null,
  );
  if (error) {
    const status = error.message.includes("stejnými údaji") ? 409 : 500;
    return chybaOdpoved(sezona, error.message, status);
  }
  return NextResponse.json({ ok: true, ...dataCilDebug(sezona), action });
}
