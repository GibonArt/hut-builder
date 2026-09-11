import { NextResponse } from "next/server";
import {
  aktualizujKartu,
  smazKartuPodleSlug,
  vlozKartu,
} from "@/lib/cardsDb";
import { sezonaZSearchParams } from "@/lib/sezona";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabaseServiceClient";
import type { HutCard } from "@/types";

type Body = {
  action?: "insert" | "update" | "delete";
  card?: HutCard;
  /** Původní card_slug při update / delete. */
  cardSlug?: string;
  puvodniKarta?: HutCard | null;
};

/**
 * Zápis karet přes service role (obejde RLS).
 * Prohlížeč → NHL27 PostgREST často bez JWT (Auth je NHL26) → RLS/FK chaos.
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
      {
        error: String(e instanceof Error ? e.message : e),
      },
      { status: 500 },
    );
  }

  if (action === "delete") {
    const slug = body.cardSlug?.trim();
    if (!slug) {
      return NextResponse.json({ error: "Chybí cardSlug." }, { status: 400 });
    }
    const { error } = await smazKartuPodleSlug(adminDb, user.id, slug);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sezona, action });
  }

  if (!body.card || typeof body.card !== "object") {
    return NextResponse.json({ error: "Chybí card." }, { status: 400 });
  }

  if (action === "insert") {
    const { error } = await vlozKartu(adminDb, user.id, body.card);
    if (error) {
      const status = error.message.includes("stejnými údaji") ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ ok: true, sezona, action });
  }

  // update
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
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ ok: true, sezona, action });
}
