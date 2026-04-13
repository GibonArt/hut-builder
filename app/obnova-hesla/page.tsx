"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AuthPageShell,
  authFormPanelClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedLinkClass,
  authPrimaryButtonClass,
} from "@/components/AuthPageShell";
import { createClient } from "@/lib/supabase/client";

export default function ObnovaHeslaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/nove-heslo")}`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );
      if (err) {
        setError(err.message);
        return;
      }
      setInfo(
        "Pokud účet existuje, pošleme e-mail s odkazem na nastavení nového hesla. Zkontroluj schránku i spam.",
      );
    } catch {
      setError("Nepodařilo se odeslat žádost. Zkus to znovu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageShell>
      <div className={authFormPanelClass}>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Zapomenuté heslo
        </h1>
        <p className="mt-2 text-sm text-[var(--hut-muted)]">
          Zadej e-mail k účtu — pošleme odkaz pro nastavení nového hesla.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <p
              className="rounded-lg border border-red-400/35 bg-red-950/55 px-3 py-2 text-sm text-red-100 backdrop-blur-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="rounded-lg border border-[var(--hut-lime)]/35 bg-[var(--hut-lime)]/8 px-3 py-2 text-sm text-[var(--hut-lime)]">
              {info}
            </p>
          ) : null}

          <div>
            <label htmlFor="reset-email" className={authLabelClass}>
              E-mail
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              className={authInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className={authPrimaryButtonClass}
          >
            {pending ? "Odesílám…" : "Poslat odkaz"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--hut-muted)]">
          <Link href="/login" className={authLinkClass}>
            Zpět na přihlášení
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className={authMutedLinkClass}>
            ← Zpět do aplikace
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
