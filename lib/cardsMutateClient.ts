"use client";

import type { NajdiMetaTypuKartyOpts } from "@/lib/hutdbTypKaret";
import type { Sezona } from "@/lib/sezona";
import type { HutCard } from "@/types";

type MutateResult = { error: Error | null };

async function cardsMutate(
  sezona: Sezona,
  body: Record<string, unknown>,
): Promise<MutateResult> {
  const res = await fetch(
    `/api/cards/mutate?sezona=${encodeURIComponent(sezona)}`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { error: new Error(j.error ?? `HTTP ${res.status}`) };
  }
  return { error: null };
}

/** Insert karty přes service-role API (spolehlivé pro NHL27). */
export async function vlozKartuPresApi(
  sezona: Sezona,
  card: HutCard,
  _opts?: { typKartyMeta?: NajdiMetaTypuKartyOpts | null },
): Promise<MutateResult> {
  return cardsMutate(sezona, { action: "insert", card });
}

export async function aktualizujKartuPresApi(
  sezona: Sezona,
  puvodniSlug: string,
  card: HutCard,
  puvodniKarta?: HutCard | null,
): Promise<MutateResult> {
  return cardsMutate(sezona, {
    action: "update",
    card,
    cardSlug: puvodniSlug,
    puvodniKarta: puvodniKarta ?? null,
  });
}

export async function smazKartuPresApi(
  sezona: Sezona,
  cardSlug: string,
): Promise<MutateResult> {
  return cardsMutate(sezona, { action: "delete", cardSlug });
}
