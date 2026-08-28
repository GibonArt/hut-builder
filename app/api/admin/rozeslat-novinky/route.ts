import { NextResponse } from "next/server";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createClient } from "@/lib/supabase/server";

const MAX_PREDMET = 200;
const MAX_TEXT = 50_000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ResendErrorBody = { message?: string };

/**
 * Hromadné odeslání e-mailů registrovaným uživatelům (stejný seznam jako přehled v adminu).
 * Pouze pro účet s e-mailem v `jeBonusAdmin`. Vyžaduje Resend API klíč na serveru.
 */
export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromRaw = process.env.HUT_EMAIL_FROM?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Na serveru chybí RESEND_API_KEY. Nastav ji v prostředí (Vercel / .env) a ověřenou adresu odesílatele v Resend.",
      },
      { status: 503 },
    );
  }
  if (!fromRaw) {
    return NextResponse.json(
      {
        error:
          "Chybí HUT_EMAIL_FROM (např. „HUT <newsletter@tvoje-domena.cz>“) — ověř doménu v Resend.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("predmet" in body) ||
    !("text" in body)
  ) {
    return NextResponse.json(
      { error: "Očekávám JSON s poli predmet a text." },
      { status: 400 },
    );
  }

  const predmet =
    typeof (body as { predmet?: unknown }).predmet === "string"
      ? (body as { predmet: string }).predmet.trim()
      : "";
  const text =
    typeof (body as { text?: unknown }).text === "string"
      ? (body as { text: string }).text
      : "";

  if (!predmet || predmet.length > MAX_PREDMET) {
    return NextResponse.json(
      { error: `Vyplň předmět (1–${MAX_PREDMET} znaků).` },
      { status: 400 },
    );
  }
  if (!text.trim() || text.length > MAX_TEXT) {
    return NextResponse.json(
      { error: `Vyplň text zprávy (max ${MAX_TEXT} znaků).` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !jeBonusAdmin(user.email)) {
    return NextResponse.json({ error: "Přístup zamítnut." }, { status: 403 });
  }

  const { data: radky, error: rpcErr } = await supabase.rpc(
    "admin_prehled_uzivatelu_karet",
  );

  if (rpcErr) {
    return NextResponse.json(
      { error: rpcErr.message || "Nepodařilo se načíst uživatele." },
      { status: 502 },
    );
  }

  const emails = new Set<string>();
  for (const row of (radky ?? []) as { email?: string }[]) {
    const e = String(row.email ?? "")
      .trim()
      .toLowerCase();
    if (e.includes("@")) emails.add(e);
  }

  if (emails.size === 0) {
    return NextResponse.json(
      { error: "Žádné e-mailové adresy k odeslání." },
      { status: 400 },
    );
  }

  const htmlTelo = `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.5">${escapeHtml(text)}</pre><p style="margin-top:1.5rem;font-size:12px;color:#666">— HUT</p>`;

  let odeslano = 0;
  const chyby: string[] = [];

  for (const to of emails) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromRaw,
        to: [to],
        subject: predmet,
        html: htmlTelo,
        reply_to: user.email,
      }),
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const j = (await res.json()) as ResendErrorBody;
        if (j.message) detail = j.message;
      } catch {
        /* ignore */
      }
      chyby.push(`${to}: ${detail}`);
    } else {
      odeslano += 1;
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({
    ok: true,
    odeslano,
    celkem: emails.size,
    chyb: chyby.length,
    chyby: chyby.length ? chyby.slice(0, 20) : [],
  });
}
