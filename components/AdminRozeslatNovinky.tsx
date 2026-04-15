"use client";

import { useState } from "react";

export function AdminRozeslatNovinky({ pocetAdresatu }: { pocetAdresatu: number }) {
  const [predmet, setPredmet] = useState("");
  const [text, setText] = useState("");
  const [odesilam, setOdesilam] = useState(false);
  const [vysledek, setVysledek] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  const odeslat = async () => {
    setChyba(null);
    setVysledek(null);
    if (!predmet.trim() || !text.trim()) {
      setChyba("Vyplň předmět i text.");
      return;
    }
    if (
      !window.confirm(
        `Opravdu odeslat e-mail všem ${pocetAdresatu} registrovaným adresám z přehledu?`,
      )
    ) {
      return;
    }
    setOdesilam(true);
    try {
      const res = await fetch("/api/admin/rozeslat-novinky", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predmet: predmet.trim(), text }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        odeslano?: number;
        celkem?: number;
        chyb?: number;
        chyby?: string[];
      };
      if (!res.ok) {
        setChyba(data.error ?? `Chyba ${res.status}`);
        return;
      }
      if (data.ok) {
        setVysledek(
          `Odesláno: ${data.odeslano ?? 0} / ${data.celkem ?? 0}. Neúspěch: ${data.chyb ?? 0}.` +
            (data.chyby?.length
              ? `\n\nPrvní chyby:\n${data.chyby.slice(0, 5).join("\n")}`
              : ""),
        );
      }
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Neznámá chyba");
    } finally {
      setOdesilam(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/52 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white">Rozeslat novinky e-mailem</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--hut-muted)]">
        Odešle jeden e-mail na každou adresu z tabulky výše ({pocetAdresatu} uživatelů). Používá se služba{" "}
        <span className="text-zinc-300">Resend</span> — na serveru musí být nastavené{" "}
        <code className="rounded bg-[var(--hut-bg-elevated)] px-1 font-mono text-xs">RESEND_API_KEY</code> a ověřený{" "}
        <code className="rounded bg-[var(--hut-bg-elevated)] px-1 font-mono text-xs">HUT_EMAIL_FROM</code>. Odpovědi
        půjdou na tvůj přihlášený e-mail (Reply-To).
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="admin-mail-predmet" className="mb-1.5 block text-xs font-medium text-[var(--hut-muted)]">
            Předmět
          </label>
          <input
            id="admin-mail-predmet"
            type="text"
            value={predmet}
            onChange={(e) => setPredmet(e.target.value)}
            maxLength={200}
            disabled={odesilam}
            className="w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]"
            placeholder="Novinky z HUT – zjednodušení přidávání karet"
          />
        </div>
        <div>
          <label htmlFor="admin-mail-text" className="mb-1.5 block text-xs font-medium text-[var(--hut-muted)]">
            Text (prostý; zalomení řádků se zachová)
          </label>
          <textarea
            id="admin-mail-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            disabled={odesilam}
            className="w-full resize-y rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]"
            placeholder="Ahoj, připravili jsme …"
          />
        </div>
      </div>
      {chyba ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
          {chyba}
        </p>
      ) : null}
      {vysledek ? (
        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-[var(--hut-lime)]/35 bg-[var(--hut-lime)]/10 px-3 py-2 text-sm text-zinc-100">
          {vysledek}
        </p>
      ) : null}
      <div className="mt-4">
        <button
          type="button"
          disabled={odesilam || pocetAdresatu === 0}
          onClick={() => void odeslat()}
          className="touch-manipulation rounded-full border border-zinc-600 bg-[var(--hut-btn)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-[var(--hut-btn-hover)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {odesilam ? "Odesílám…" : "Odeslat všem"}
        </button>
      </div>
    </section>
  );
}
